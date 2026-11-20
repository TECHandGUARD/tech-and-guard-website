create table public.corporate_shop_orders (
  id uuid primary key default gen_random_uuid(),
  checkout_key uuid not null unique,
  request_fingerprint text not null,
  access_token_hash text not null check (access_token_hash ~ '^[a-f0-9]{64}$'),
  ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
  customer_name text not null check (length(customer_name) between 1 and 120),
  email text not null check (length(email) between 3 and 254),
  phone text not null check (length(phone) between 7 and 32),
  fulfilment_method text not null check (fulfilment_method in ('collection','delivery')),
  delivery_address jsonb not null default '{}'::jsonb,
  fulfilment_cents integer not null check (fulfilment_cents between 0 and 500000),
  subtotal_cents bigint not null check (subtotal_cents > 0),
  total_cents bigint not null check (total_cents = subtotal_cents + fulfilment_cents),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  payment_provider text not null default 'payfast' check (payment_provider = 'payfast'),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','expired','refunded')),
  fulfilment_status text not null default 'awaiting_payment' check (fulfilment_status in ('awaiting_payment','processing','ready_for_dispatch','dispatched','delivered','payment_review','cancelled','refunded')),
  payfast_payment_id text unique,
  terms_version text not null check (length(terms_version) between 1 and 80),
  terms_accepted_at timestamptz not null default now(),
  reservation_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index corporate_shop_orders_status_created on public.corporate_shop_orders(payment_status,created_at desc);
create index corporate_shop_orders_ip_created on public.corporate_shop_orders(ip_hash,created_at desc);
create index corporate_shop_orders_email_created on public.corporate_shop_orders(email,created_at desc);
create index corporate_shop_orders_reservation on public.corporate_shop_orders(reservation_expires_at)
  where payment_status = 'pending';

create table public.corporate_shop_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.corporate_shop_orders(id) on delete cascade,
  sku text not null,
  title text not null,
  options text not null default '',
  quantity integer not null check (quantity between 1 and 99),
  unit_price_cents integer not null check (unit_price_cents > 0),
  line_total_cents bigint generated always as (quantity::bigint * unit_price_cents::bigint) stored,
  unique(order_id,sku)
);
create index corporate_shop_order_items_sku on public.corporate_shop_order_items(sku,order_id);

alter table public.corporate_shop_orders enable row level security;
alter table public.corporate_shop_order_items enable row level security;
revoke all on public.corporate_shop_orders, public.corporate_shop_order_items from public, anon, authenticated;
grant all on public.corporate_shop_orders, public.corporate_shop_order_items to service_role;

create table corporate_private.shop_payment_events (
  id bigint generated always as identity primary key,
  order_id uuid references public.corporate_shop_orders(id) on delete set null,
  provider_payment_id text,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table corporate_private.shop_payment_events enable row level security;
revoke all on corporate_private.shop_payment_events from public, anon, authenticated;
grant all on corporate_private.shop_payment_events to service_role;

create function corporate_private.create_shop_order(
  p_checkout_key uuid,
  p_token_hash text,
  p_ip_hash text,
  p_customer_name text,
  p_email text,
  p_phone text,
  p_fulfilment_method text,
  p_delivery_address jsonb,
  p_fulfilment_cents integer,
  p_terms_version text,
  p_items jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  clean_email text := lower(trim(p_email));
  item jsonb;
  product public.corporate_products;
  quantity integer;
  reserved integer;
  subtotal bigint := 0;
  fingerprint text;
  existing public.corporate_shop_orders;
  saved public.corporate_shop_orders;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required'; end if;
  if p_checkout_key is null or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
     or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$'
     or p_customer_name is null or length(trim(p_customer_name)) not between 1 and 120
     or clean_email is null or length(clean_email) > 254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_phone is null or length(trim(p_phone)) not between 7 and 32
     or p_fulfilment_method is null or p_fulfilment_method not in ('collection','delivery')
     or p_delivery_address is null or jsonb_typeof(p_delivery_address) is distinct from 'object'
     or p_fulfilment_cents is null or p_fulfilment_cents not between 0 and 500000
     or p_terms_version is null or length(p_terms_version) not between 1 and 80
     or jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 25 or octet_length(p_items::text) > 10000 then
    raise exception 'invalid_shop_order';
  end if;
  if (p_fulfilment_method='collection' and p_delivery_address <> '{}'::jsonb)
     or (p_fulfilment_method='delivery' and not (p_delivery_address ?& array['line1','town','postal_code'])) then
    raise exception 'invalid_shop_order';
  end if;

  perform pg_advisory_xact_lock(747509033);
  fingerprint := md5(jsonb_build_object(
    'name',trim(p_customer_name),'email',clean_email,'phone',trim(p_phone),
    'method',p_fulfilment_method,'address',p_delivery_address,
    'fulfilment_cents',p_fulfilment_cents,'terms',p_terms_version,
    'items',(select coalesce(jsonb_agg(jsonb_build_object('sku',x->>'sku','quantity',(x->>'quantity')::integer) order by x->>'sku'),'[]'::jsonb)
             from jsonb_array_elements(p_items) x)
  )::text);
  select * into existing from public.corporate_shop_orders where checkout_key = p_checkout_key;
  if found then
    if existing.access_token_hash is distinct from p_token_hash then raise exception 'checkout_key_conflict'; end if;
    if existing.request_fingerprint is distinct from fingerprint then raise exception 'checkout_key_conflict'; end if;
    return jsonb_build_object('id',existing.id,'payment_status',existing.payment_status,
      'fulfilment_status',existing.fulfilment_status,'subtotal_cents',existing.subtotal_cents,
      'fulfilment_cents',existing.fulfilment_cents,'total_cents',existing.total_cents,
      'reservation_expires_at',existing.reservation_expires_at,
      'items',(select coalesce(jsonb_agg(jsonb_build_object('sku',i.sku,'title',i.title,'quantity',i.quantity,'unit_price_cents',i.unit_price_cents) order by i.sku),'[]'::jsonb)
               from public.corporate_shop_order_items i where i.order_id=existing.id));
  end if;

  if (select count(*) from public.corporate_shop_orders o where o.created_at > now()-interval '1 day') >= 200
     or (select count(*) from public.corporate_shop_orders o where o.ip_hash=p_ip_hash and o.created_at > now()-interval '1 hour') >= 10
     or (select count(*) from public.corporate_shop_orders o where o.email=clean_email and o.created_at > now()-interval '1 hour') >= 5 then
    raise exception 'checkout_rate_limit';
  end if;
  if exists(select 1 from jsonb_array_elements(p_items) x group by x->>'sku' having count(*) > 1) then
    raise exception 'invalid_shop_order';
  end if;

  for item in select value from jsonb_array_elements(p_items) order by value->>'sku' loop
    if jsonb_typeof(item) is distinct from 'object' or item->>'sku' is null
       or coalesce(item->>'quantity','') !~ '^[1-9][0-9]?$' then raise exception 'invalid_shop_order'; end if;
    quantity := (item->>'quantity')::integer;
    select * into product from public.corporate_products p where p.sku=item->>'sku' and p.published for update;
    if not found or product.stock is null then raise exception 'catalogue_changed'; end if;
    select coalesce(sum(i.quantity),0)::integer into reserved
      from public.corporate_shop_order_items i
      join public.corporate_shop_orders o on o.id=i.order_id
      where i.sku=product.sku and o.payment_status='pending' and o.reservation_expires_at > now();
    if product.stock - reserved < quantity then raise exception 'catalogue_changed'; end if;
    subtotal := subtotal + product.price_cents::bigint * quantity;
  end loop;
  if subtotal <= 0 or subtotal + p_fulfilment_cents > 100000000 then raise exception 'invalid_shop_order'; end if;

  insert into public.corporate_shop_orders(
    checkout_key,request_fingerprint,access_token_hash,ip_hash,customer_name,email,phone,
    fulfilment_method,delivery_address,fulfilment_cents,subtotal_cents,total_cents,
    terms_version,reservation_expires_at
  ) values(
    p_checkout_key,fingerprint,p_token_hash,p_ip_hash,trim(p_customer_name),clean_email,trim(p_phone),
    p_fulfilment_method,p_delivery_address,p_fulfilment_cents,subtotal,subtotal+p_fulfilment_cents,
    p_terms_version,now()+interval '20 minutes'
  ) returning * into saved;

  for item in select value from jsonb_array_elements(p_items) order by value->>'sku' loop
    select * into product from public.corporate_products where sku=item->>'sku';
    insert into public.corporate_shop_order_items(order_id,sku,title,options,quantity,unit_price_cents)
    values(saved.id,product.sku,product.title,product.options,(item->>'quantity')::integer,product.price_cents);
  end loop;
  insert into corporate_private.shop_payment_events(order_id,event_type,details)
    values(saved.id,'checkout_created',jsonb_build_object('provider','payfast','mode','server-configured'));

  return jsonb_build_object('id',saved.id,'payment_status',saved.payment_status,
    'fulfilment_status',saved.fulfilment_status,'subtotal_cents',saved.subtotal_cents,
    'fulfilment_cents',saved.fulfilment_cents,'total_cents',saved.total_cents,
    'reservation_expires_at',saved.reservation_expires_at,
    'items',(select coalesce(jsonb_agg(jsonb_build_object('sku',i.sku,'title',i.title,'quantity',i.quantity,'unit_price_cents',i.unit_price_cents) order by i.sku),'[]'::jsonb)
             from public.corporate_shop_order_items i where i.order_id=saved.id));
end;
$$;

create function corporate_private.confirm_shop_payment(p_order_id uuid,p_provider_payment_id text,p_amount_cents bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.corporate_shop_orders;
  item record;
  can_fulfil boolean := true;
  previous_status text;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required'; end if;
  if p_order_id is null or p_provider_payment_id is null or length(p_provider_payment_id) not between 1 and 64
     or p_amount_cents is null or p_amount_cents <= 0 then raise exception 'invalid_payment'; end if;
  select * into o from public.corporate_shop_orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.total_cents <> p_amount_cents then
    update public.corporate_shop_orders set fulfilment_status='payment_review',updated_at=clock_timestamp() where id=o.id returning * into o;
    insert into corporate_private.shop_payment_events(order_id,provider_payment_id,event_type,details)
      values(o.id,p_provider_payment_id,'payment_amount_mismatch',jsonb_build_object('expected_amount_cents',o.total_cents,'received_amount_cents',p_amount_cents));
    return jsonb_build_object('id',o.id,'payment_status',o.payment_status,'fulfilment_status',o.fulfilment_status,'manual_review',true);
  end if;
  if o.payfast_payment_id is not null and o.payfast_payment_id <> p_provider_payment_id then
    update public.corporate_shop_orders set fulfilment_status='payment_review',updated_at=clock_timestamp() where id=o.id returning * into o;
    insert into corporate_private.shop_payment_events(order_id,provider_payment_id,event_type,details)
      values(o.id,p_provider_payment_id,'duplicate_payment_received',jsonb_build_object('amount_cents',p_amount_cents,'existing_payment_id',o.payfast_payment_id));
    return jsonb_build_object('id',o.id,'payment_status',o.payment_status,'fulfilment_status',o.fulfilment_status,'duplicate_payment',true);
  end if;
  if o.payment_status='paid' then
    if o.payfast_payment_id is distinct from p_provider_payment_id then raise exception 'payment_reference_conflict'; end if;
    return jsonb_build_object('id',o.id,'payment_status',o.payment_status,'fulfilment_status',o.fulfilment_status,'already_processed',true);
  end if;
  if o.payment_status not in ('pending','expired','failed') then raise exception 'invalid_payment_state'; end if;

  if o.payment_status in ('expired','failed') or o.reservation_expires_at<=now() then
    previous_status:=o.payment_status;
    update public.corporate_shop_orders set payment_status='paid',fulfilment_status='payment_review',
      payfast_payment_id=p_provider_payment_id,updated_at=clock_timestamp() where id=o.id returning * into o;
    insert into corporate_private.shop_payment_events(order_id,provider_payment_id,event_type,details)
      values(o.id,p_provider_payment_id,'late_payment_received',jsonb_build_object('amount_cents',p_amount_cents,'previous_payment_status',previous_status));
    return jsonb_build_object('id',o.id,'payment_status',o.payment_status,'fulfilment_status',o.fulfilment_status,'manual_review',true);
  end if;

  for item in select sku,quantity from public.corporate_shop_order_items where order_id=o.id order by sku loop
    perform 1 from public.corporate_products p where p.sku=item.sku for update;
    if (select stock from public.corporate_products where sku=item.sku) is null
       or (select stock from public.corporate_products where sku=item.sku) < item.quantity then
      can_fulfil := false;
      exit;
    end if;
    if exists(select 1 from public.corporate_shop_order_items i join public.corporate_shop_orders other on other.id=i.order_id
      where i.sku=item.sku and other.id<>o.id and other.payment_status='pending' and other.reservation_expires_at>now()
      group by i.sku having sum(i.quantity) > (select stock from public.corporate_products where sku=item.sku)-item.quantity) then
      can_fulfil := false;
      exit;
    end if;
  end loop;

  if can_fulfil then
    for item in select sku,quantity from public.corporate_shop_order_items where order_id=o.id order by sku loop
      update public.corporate_products set stock=stock-item.quantity,updated_at=clock_timestamp()
        where sku=item.sku and stock >= item.quantity;
      if not found then raise exception 'stock_changed_during_payment'; end if;
    end loop;
  end if;
  update public.corporate_shop_orders set payment_status='paid',
    fulfilment_status=case when can_fulfil then 'processing' else 'payment_review' end,
    payfast_payment_id=p_provider_payment_id,updated_at=clock_timestamp()
    where id=o.id returning * into o;
  insert into corporate_private.shop_payment_events(order_id,provider_payment_id,event_type,details)
    values(o.id,p_provider_payment_id,'payment_confirmed',jsonb_build_object('amount_cents',p_amount_cents,'fulfilment_status',o.fulfilment_status));
  return jsonb_build_object('id',o.id,'payment_status',o.payment_status,'fulfilment_status',o.fulfilment_status,'already_processed',false);
end;
$$;

create function corporate_private.fail_shop_payment(p_order_id uuid,p_provider_payment_id text,p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare o public.corporate_shop_orders;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required'; end if;
  select * into o from public.corporate_shop_orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.payment_status='pending' and o.payfast_payment_id is null then
    update public.corporate_shop_orders set payment_status='failed',fulfilment_status='cancelled',updated_at=clock_timestamp() where id=o.id;
  end if;
  insert into corporate_private.shop_payment_events(order_id,provider_payment_id,event_type,details)
    values(o.id,p_provider_payment_id,'payment_failed',jsonb_build_object('reason',left(coalesce(p_reason,'unknown'),120)));
  return true;
end;
$$;

create function corporate_private.get_shop_order_status(p_order_id uuid,p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.corporate_shop_orders;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required'; end if;
  if p_order_id is null or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'order_not_found'; end if;
  update public.corporate_shop_orders set payment_status='expired',fulfilment_status='cancelled',updated_at=clock_timestamp()
    where id=p_order_id and access_token_hash=p_token_hash and payment_status='pending' and reservation_expires_at<=now();
  select * into o from public.corporate_shop_orders where id=p_order_id and access_token_hash=p_token_hash;
  if not found then raise exception 'order_not_found'; end if;
  return jsonb_build_object('id',o.id,'payment_status',o.payment_status,'fulfilment_status',o.fulfilment_status,
    'total_cents',o.total_cents,'currency',o.currency,'created_at',o.created_at,
    'items',(select coalesce(jsonb_agg(jsonb_build_object('title',i.title,'quantity',i.quantity,'unit_price_cents',i.unit_price_cents) order by i.id),'[]'::jsonb)
             from public.corporate_shop_order_items i where i.order_id=o.id));
end;
$$;

create function corporate_private.list_shop_orders(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not corporate_private.is_admin() then raise exception 'Store administrator required'; end if;
  if p_limit is null or p_limit not between 1 and 200 then raise exception 'invalid_shop_order'; end if;
  update public.corporate_shop_orders set payment_status='expired',fulfilment_status='cancelled',updated_at=clock_timestamp()
    where payment_status='pending' and reservation_expires_at<=now();
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id',o.id,'customer_name',o.customer_name,'email',o.email,'phone',o.phone,
    'fulfilment_method',o.fulfilment_method,'delivery_address',o.delivery_address,
    'fulfilment_cents',o.fulfilment_cents,'subtotal_cents',o.subtotal_cents,'total_cents',o.total_cents,
    'payment_status',o.payment_status,'fulfilment_status',o.fulfilment_status,
    'payfast_payment_id',o.payfast_payment_id,'reservation_expires_at',o.reservation_expires_at,
    'created_at',o.created_at,'updated_at',o.updated_at,
    'items',(select coalesce(jsonb_agg(jsonb_build_object('sku',i.sku,'title',i.title,'options',i.options,'quantity',i.quantity,'unit_price_cents',i.unit_price_cents) order by i.id),'[]'::jsonb)
             from public.corporate_shop_order_items i where i.order_id=o.id),
    'payment_events',(select coalesce(jsonb_agg(jsonb_build_object('provider_payment_id',e.provider_payment_id,'event_type',e.event_type,'details',e.details,'created_at',e.created_at) order by e.created_at desc),'[]'::jsonb)
             from corporate_private.shop_payment_events e where e.order_id=o.id)
  ) order by o.created_at desc),'[]'::jsonb) from (select * from public.corporate_shop_orders order by created_at desc limit p_limit) o);
end;
$$;

create function corporate_private.update_shop_fulfilment(p_order_id uuid,p_next_status text,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.corporate_shop_orders;
begin
  if not corporate_private.is_admin() then raise exception 'Store administrator required'; end if;
  if p_next_status is null or p_next_status not in ('processing','ready_for_dispatch','dispatched','delivered','payment_review','refunded') then raise exception 'invalid_shop_order'; end if;
  select * into o from public.corporate_shop_orders where id=p_order_id for update;
  if not found or o.updated_at is distinct from p_expected_updated_at then raise exception 'record_changed'; end if;
  if p_next_status='refunded' and (o.payment_status<>'paid' or o.fulfilment_status not in ('payment_review','processing','ready_for_dispatch','dispatched','delivered')) then raise exception 'invalid_shop_order'; end if;
  if p_next_status<>'refunded' and o.payment_status<>'paid' then raise exception 'invalid_shop_order'; end if;
  if (p_next_status='ready_for_dispatch' and o.fulfilment_status not in ('processing','ready_for_dispatch'))
     or (p_next_status='dispatched' and o.fulfilment_status not in ('ready_for_dispatch','dispatched'))
     or (p_next_status='delivered' and o.fulfilment_status not in ('dispatched','delivered')) then raise exception 'invalid_shop_order'; end if;
  update public.corporate_shop_orders set fulfilment_status=p_next_status,
    payment_status=case when p_next_status='refunded' then 'refunded' else payment_status end,
    updated_at=clock_timestamp() where id=o.id returning * into o;
  insert into corporate_private.store_events(actor,event_type,subject,details)
    values(auth.uid(),'shop_fulfilment_updated',o.id::text,jsonb_build_object('fulfilment_status',o.fulfilment_status,'payment_status',o.payment_status));
  return jsonb_build_object('id',o.id,'payment_status',o.payment_status,'fulfilment_status',o.fulfilment_status,'updated_at',o.updated_at);
end;
$$;

create function public.corporate_create_shop_order(
  p_checkout_key uuid,p_token_hash text,p_ip_hash text,p_customer_name text,p_email text,p_phone text,
  p_fulfilment_method text,p_delivery_address jsonb,p_fulfilment_cents integer,p_terms_version text,p_items jsonb
) returns jsonb language sql security definer set search_path = '' as $$
  select corporate_private.create_shop_order(p_checkout_key,p_token_hash,p_ip_hash,p_customer_name,p_email,p_phone,
    p_fulfilment_method,p_delivery_address,p_fulfilment_cents,p_terms_version,p_items)
$$;
create function public.corporate_confirm_shop_payment(p_order_id uuid,p_provider_payment_id text,p_amount_cents bigint)
returns jsonb language sql security definer set search_path = '' as $$ select corporate_private.confirm_shop_payment(p_order_id,p_provider_payment_id,p_amount_cents) $$;
create function public.corporate_fail_shop_payment(p_order_id uuid,p_provider_payment_id text,p_reason text)
returns boolean language sql security definer set search_path = '' as $$ select corporate_private.fail_shop_payment(p_order_id,p_provider_payment_id,p_reason) $$;
create function public.corporate_get_shop_order_status(p_order_id uuid,p_token_hash text)
returns jsonb language sql security definer set search_path = '' as $$ select corporate_private.get_shop_order_status(p_order_id,p_token_hash) $$;
create function public.corporate_list_shop_orders(p_limit integer default 100)
returns jsonb language sql security invoker set search_path = '' as $$ select corporate_private.list_shop_orders(p_limit) $$;
create function public.corporate_update_shop_fulfilment(p_order_id uuid,p_next_status text,p_expected_updated_at timestamptz)
returns jsonb language sql security invoker set search_path = '' as $$ select corporate_private.update_shop_fulfilment(p_order_id,p_next_status,p_expected_updated_at) $$;

revoke all on function corporate_private.create_shop_order(uuid,text,text,text,text,text,text,jsonb,integer,text,jsonb),
  corporate_private.confirm_shop_payment(uuid,text,bigint),corporate_private.fail_shop_payment(uuid,text,text),
  corporate_private.get_shop_order_status(uuid,text),public.corporate_create_shop_order(uuid,text,text,text,text,text,text,jsonb,integer,text,jsonb),
  public.corporate_confirm_shop_payment(uuid,text,bigint),public.corporate_fail_shop_payment(uuid,text,text),
  public.corporate_get_shop_order_status(uuid,text),corporate_private.list_shop_orders(integer),
  corporate_private.update_shop_fulfilment(uuid,text,timestamptz),public.corporate_list_shop_orders(integer),
  public.corporate_update_shop_fulfilment(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.corporate_create_shop_order(uuid,text,text,text,text,text,text,jsonb,integer,text,jsonb),
  public.corporate_confirm_shop_payment(uuid,text,bigint),public.corporate_fail_shop_payment(uuid,text,text),
  public.corporate_get_shop_order_status(uuid,text) to service_role;
grant execute on function corporate_private.create_shop_order(uuid,text,text,text,text,text,text,jsonb,integer,text,jsonb),
  corporate_private.confirm_shop_payment(uuid,text,bigint),corporate_private.fail_shop_payment(uuid,text,text),
  corporate_private.get_shop_order_status(uuid,text) to service_role;
grant execute on function public.corporate_list_shop_orders(integer),public.corporate_update_shop_fulfilment(uuid,text,timestamptz),
  corporate_private.list_shop_orders(integer),corporate_private.update_shop_fulfilment(uuid,text,timestamptz) to authenticated;
