create table public.corporate_orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id), request_key uuid not null, request_fingerprint text not null,
 customer_name text not null check(length(customer_name) between 1 and 120),
 email text not null, notes text not null default '' check(length(notes)<=2000),
 items jsonb not null, subtotal_cents bigint not null check(subtotal_cents>0),
 status text not null default 'requested' check(status in ('requested','reviewed','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,request_key)
);
create index corporate_orders_user_created on public.corporate_orders(user_id,created_at desc);
alter table public.corporate_orders enable row level security;
revoke all on public.corporate_orders from public,anon,authenticated;
grant select on public.corporate_orders to authenticated;
grant all on public.corporate_orders to service_role;
create policy "Customer own requests and store staff" on public.corporate_orders for select to authenticated
 using(user_id=(select auth.uid()) or corporate_private.is_admin());
create table corporate_private.store_events (
 id bigint generated always as identity primary key, actor uuid not null,
 event_type text not null, subject text not null, details jsonb not null,
 created_at timestamptz not null default now()
);
alter table corporate_private.store_events enable row level security;
revoke all on corporate_private.store_events from public,anon,authenticated;
grant all on corporate_private.store_events to service_role;

create function corporate_private.create_order_request(request_items jsonb,customer_name text,notes text,request_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); buyer_email text; existing public.corporate_orders;
 item jsonb; p public.corporate_products; quantity integer;
 snapshot jsonb:='[]'; subtotal bigint:=0; result public.corporate_orders;
begin
 select u.email into buyer_email from auth.users u where u.id=actor and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now());
 if buyer_email is null then raise exception 'verified_account_required';end if;
 if request_key is null or customer_name is null or length(trim(customer_name)) not between 1 and 120 or notes is null or length(notes)>2000 then raise exception 'invalid_request';end if;
 -- Serialize submissions per account, including retries and rate-limit checks.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select * into existing from public.corporate_orders o where o.user_id=actor and o.request_key=create_order_request.request_key;
 if found then
 if existing.request_fingerprint is distinct from md5(jsonb_build_object('items',request_items,'name',trim(customer_name),'notes',notes)::text) then raise exception 'request_changed';end if;
 return jsonb_build_object('id',existing.id,'subtotal_cents',existing.subtotal_cents,'status',existing.status);end if;
 if (select count(*) from public.corporate_orders o where o.user_id=actor and o.created_at>now()-interval '24 hours')>=5 then raise exception 'request_limit';end if;
 if jsonb_typeof(request_items) is distinct from 'array' or jsonb_array_length(request_items) not between 1 and 25 or octet_length(request_items::text)>10000 then raise exception 'invalid_request';end if;
 if exists(select 1 from jsonb_array_elements(request_items) x group by x->>'sku' having count(*)>1) then raise exception 'invalid_request';end if;
 -- Deterministic lock order protects a consistent server-priced snapshot.
 for item in select value from jsonb_array_elements(request_items) order by value->>'sku' loop
  if jsonb_typeof(item) is distinct from 'object' or item->>'sku' is null or (item->>'quantity') is null or not (item->>'quantity' ~ '^[1-9][0-9]?$') then raise exception 'invalid_request';end if;
  quantity:=(item->>'quantity')::integer;
  select * into p from public.corporate_products where sku=item->>'sku' and published for share;
  if not found or (p.stock is not null and p.stock<quantity) then raise exception 'catalogue_changed';end if;
  subtotal:=subtotal+p.price_cents::bigint*quantity;
  snapshot:=snapshot||jsonb_build_array(jsonb_build_object('sku',p.sku,'title',p.title,'options',p.options,'quantity',quantity,'unit_price_cents',p.price_cents));
 end loop;
 insert into public.corporate_orders(user_id,request_key,request_fingerprint,customer_name,email,notes,items,subtotal_cents)
 values(actor,request_key,md5(jsonb_build_object('items',request_items,'name',trim(customer_name),'notes',notes)::text),trim(customer_name),buyer_email,notes,snapshot,subtotal) returning * into result;
 insert into corporate_private.store_events(actor,event_type,subject,details) values(actor,'order_requested',result.id::text,jsonb_build_object('subtotal_cents',subtotal));
 return jsonb_build_object('id',result.id,'subtotal_cents',subtotal,'status',result.status);
end;$$;
create function public.corporate_create_order_request(request_items jsonb,customer_name text,notes text,request_key uuid)
returns jsonb language sql security invoker set search_path='' as $$select corporate_private.create_order_request(request_items,customer_name,notes,request_key)$$;

create function corporate_private.review_order_request(order_id uuid,next_status text,expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.corporate_orders;
begin
 if not corporate_private.is_admin() then raise exception 'Store administrator required';end if;
 if next_status is null or next_status not in ('reviewed','cancelled') then raise exception 'invalid_status';end if;
 select * into o from public.corporate_orders where id=order_id for update;
 if not found or expected_updated_at is distinct from o.updated_at then raise exception 'record_changed';end if;
 if o.status='cancelled' or o.status=next_status then raise exception 'invalid_status';end if;
 update public.corporate_orders set status=next_status,updated_at=clock_timestamp() where id=order_id returning * into o;
 insert into corporate_private.store_events(actor,event_type,subject,details) values(auth.uid(),'order_status',order_id::text,jsonb_build_object('status',next_status));
 return jsonb_build_object('id',o.id,'status',o.status);
end;$$;
create function public.corporate_review_order_request(order_id uuid,next_status text,expected_updated_at timestamptz)
returns jsonb language sql security invoker set search_path='' as $$select corporate_private.review_order_request(order_id,next_status,expected_updated_at)$$;

create function corporate_private.edit_product(product_sku text,product_title text,product_description text,product_price_cents integer,product_stock integer,expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.corporate_products;
begin
 if not corporate_private.is_admin() then raise exception 'Store administrator required';end if;
 if product_title is null or length(trim(product_title)) not between 1 and 300 or product_description is null or length(product_description)>10000 or product_price_cents is null or product_price_cents<=0 or (product_stock is not null and product_stock not between 0 and 1000000) then raise exception 'invalid_product';end if;
 select * into p from public.corporate_products where sku=product_sku for update;
 if not found or expected_updated_at is distinct from p.updated_at then raise exception 'record_changed';end if;
 insert into corporate_private.store_events(actor,event_type,subject,details) values(auth.uid(),'product_edited',product_sku,jsonb_build_object('old_price_cents',p.price_cents,'new_price_cents',product_price_cents,'old_stock',p.stock,'new_stock',product_stock));
 update public.corporate_products set title=trim(product_title),description=product_description,price_cents=product_price_cents,stock=product_stock,updated_at=clock_timestamp() where sku=product_sku;
 return jsonb_build_object('sku',product_sku);
end;$$;
create function public.corporate_edit_product(product_sku text,product_title text,product_description text,product_price_cents integer,product_stock integer,expected_updated_at timestamptz)
returns jsonb language sql security invoker set search_path='' as $$select corporate_private.edit_product(product_sku,product_title,product_description,product_price_cents,product_stock,expected_updated_at)$$;

revoke all on function corporate_private.create_order_request(jsonb,text,text,uuid), public.corporate_create_order_request(jsonb,text,text,uuid), corporate_private.review_order_request(uuid,text,timestamptz),public.corporate_review_order_request(uuid,text,timestamptz),corporate_private.edit_product(text,text,text,integer,integer,timestamptz),public.corporate_edit_product(text,text,text,integer,integer,timestamptz) from public,anon;
grant execute on function corporate_private.create_order_request(jsonb,text,text,uuid), public.corporate_create_order_request(jsonb,text,text,uuid), corporate_private.review_order_request(uuid,text,timestamptz),public.corporate_review_order_request(uuid,text,timestamptz),corporate_private.edit_product(text,text,text,integer,integer,timestamptz),public.corporate_edit_product(text,text,text,integer,integer,timestamptz) to authenticated;
