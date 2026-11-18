create table corporate_private.enquiries (
 id uuid primary key default gen_random_uuid(),
 request_key uuid not null unique,
 kind text not null check(kind in ('service','product')),
 customer_name text not null,
 email text not null,
 topic text not null,
 message text not null,
 items jsonb not null default '[]',
 status text not null default 'new' check(status in ('new','in_progress','closed')),
 assigned_to uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table corporate_private.enquiries enable row level security;
revoke all on corporate_private.enquiries from public, anon, authenticated;
create index corporate_enquiries_email_date on corporate_private.enquiries(email, created_at desc);
create index corporate_enquiries_created on corporate_private.enquiries(created_at desc, id desc);

create function public.corporate_enquiry_intake_ready() returns boolean
language sql immutable set search_path='' as $$select true$$;
revoke all on function public.corporate_enquiry_intake_ready() from public;
grant execute on function public.corporate_enquiry_intake_ready() to anon, authenticated;

create function public.corporate_submit_enquiry(
 p_key uuid, p_kind text, p_name text, p_email text, p_topic text, p_message text, p_items jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 clean_email text := lower(trim(p_email));
 entry corporate_private.enquiries;
 item jsonb;
 product public.corporate_products;
 quantity integer;
 validated_items jsonb := '[]';
begin
 if p_key is null or p_kind is null or p_kind not in ('service','product')
  or p_name is null or char_length(trim(p_name)) not between 1 and 120
  or clean_email is null or char_length(clean_email)>254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  or p_topic is null or char_length(p_topic)>160
  or p_message is null or char_length(trim(p_message)) not between 1 and 2000
  or jsonb_typeof(p_items) is distinct from 'array' or octet_length(p_items::text)>10000
  or (p_kind='service' and jsonb_array_length(p_items)<>0)
  or (p_kind='product' and jsonb_array_length(p_items) not between 1 and 25)
 then raise exception 'invalid_enquiry'; end if;

 perform pg_advisory_xact_lock(747509031);
 select * into entry from corporate_private.enquiries where request_key=p_key;
 if found then
  if entry.email=clean_email and entry.kind=p_kind and entry.customer_name=trim(p_name)
   and entry.topic=trim(p_topic) and entry.message=trim(p_message)
   and (select coalesce(jsonb_agg(jsonb_build_object('sku',x->>'sku','quantity',(x->>'quantity')::integer)
      order by x->>'sku'),'[]'::jsonb) from jsonb_array_elements(entry.items) x)
     = (select coalesce(jsonb_agg(x order by x->>'sku'),'[]'::jsonb) from jsonb_array_elements(p_items) x)
  then return entry.id; end if;
  raise exception 'enquiry_conflict';
 end if;
 if (select count(*) from corporate_private.enquiries where created_at > now()-interval '1 hour') >= 80
  or (select count(*) from corporate_private.enquiries where email=clean_email and created_at > now()-interval '1 hour') >= 5
 then raise exception 'enquiry_limit'; end if;

 if exists(select 1 from jsonb_array_elements(p_items) x group by x->>'sku' having count(*)>1)
 then raise exception 'invalid_enquiry'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item) is distinct from 'object' or length(item->>'sku') not between 1 and 160
   or coalesce(item->>'quantity','') !~ '^[1-9][0-9]?$'
  then raise exception 'invalid_enquiry'; end if;
  quantity := (item->>'quantity')::integer;
  select * into product from public.corporate_products where sku=item->>'sku' and published;
  if not found or (product.stock is not null and product.stock<quantity)
  then raise exception 'catalogue_changed'; end if;
  validated_items := validated_items || jsonb_build_object('sku',product.sku,'title',product.title,'quantity',quantity);
 end loop;

 insert into corporate_private.enquiries(request_key,kind,customer_name,email,topic,message,items)
 values(p_key,p_kind,trim(p_name),clean_email,trim(p_topic),trim(p_message),validated_items)
 returning id into entry.id;
 return entry.id;
end;
$$;
revoke all on function public.corporate_submit_enquiry(uuid,text,text,text,text,text,jsonb) from public;
grant execute on function public.corporate_submit_enquiry(uuid,text,text,text,text,text,jsonb) to anon, authenticated;

create function public.corporate_list_enquiries(p_kind text, p_status text, p_offset integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not corporate_private.is_admin() then raise exception 'Store administrator required'; end if;
 if p_offset is null or p_offset not between 0 and 10000 then raise exception 'invalid_enquiry'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(e)-'request_key' order by e.created_at desc,e.id desc),'[]'::jsonb)
 from (select * from corporate_private.enquiries
 where (p_kind='all' or kind=p_kind) and (p_status='all' or status=p_status)
 order by created_at desc,id desc limit 50 offset p_offset) e);
end;
$$;

create function public.corporate_update_enquiry(p_id uuid, p_status text, p_claim boolean, p_updated_at timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare entry corporate_private.enquiries;
begin
 if not corporate_private.is_admin() then raise exception 'Store administrator required'; end if;
 if p_status is null or p_status not in ('new','in_progress','closed') or p_claim is null
 then raise exception 'invalid_enquiry'; end if;
 select * into entry from corporate_private.enquiries where id=p_id for update;
 if not found or entry.updated_at is distinct from p_updated_at then raise exception 'record_changed'; end if;
 if p_claim and entry.assigned_to is not null and entry.assigned_to<>auth.uid()
 then raise exception 'record_changed'; end if;
 update corporate_private.enquiries set status=p_status,
  assigned_to=case when p_claim then auth.uid() else assigned_to end,
  updated_at=greatest(clock_timestamp(),updated_at+interval '1 microsecond')
 where id=p_id;
 insert into corporate_private.store_events(actor,event_type,subject,details)
 values(auth.uid(),'enquiry_updated',p_id::text,jsonb_build_object('status',p_status,'claimed',p_claim));
 return true;
end;
$$;
revoke all on function public.corporate_list_enquiries(text,text,integer),
 public.corporate_update_enquiry(uuid,text,boolean,timestamptz) from public, anon;
grant execute on function public.corporate_list_enquiries(text,text,integer),
 public.corporate_update_enquiry(uuid,text,boolean,timestamptz) to authenticated;
