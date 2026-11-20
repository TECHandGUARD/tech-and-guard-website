begin;

insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values ('7604d57c-daaa-4b84-b855-72491c179901','quote-staff@example.invalid',now(),'{}','{}'),
       ('7604d57c-daaa-4b84-b855-72491c179902','quote-customer@example.invalid',now(),'{}','{}');
insert into corporate_private.staff_grants(email,staff_role) values ('quote-staff@example.invalid','staff');

set local role anon;
do $$
begin
  if has_function_privilege('public.corporate_quote_desk_enquiries(text,text,integer,boolean)', 'execute')
    or has_function_privilege('public.corporate_log_enquiry(uuid,text,text,text,text,text,text,text,date)', 'execute')
    or has_function_privilege('public.corporate_set_enquiry_follow_up(uuid,timestamptz,date)', 'execute')
    or has_function_privilege('public.corporate_save_enquiry_quote(uuid,timestamptz,text,date,jsonb)', 'execute') then
    raise exception 'Guest can execute a staff operation';
  end if;
  perform public.corporate_submit_enquiry(gen_random_uuid(),'service','Website fixture','quote-web@example.invalid',
    'Website request','Ordinary website enquiry','[]');
end;
$$;
reset role;

select set_config('request.jwt.claim.sub','7604d57c-daaa-4b84-b855-72491c179902',true);
set local role authenticated;
do $$
begin
  begin
    perform public.corporate_quote_desk_enquiries('all','all',0,false);
    raise exception 'Customer could read the staff queue';
  exception when others then
    if sqlerrm <> 'Store administrator required' then raise; end if;
  end;
  begin
    perform public.corporate_log_enquiry(gen_random_uuid(),'email','service','Customer','quote-customer@example.invalid',null,'Test','Test',null);
    raise exception 'Customer could manually log an enquiry';
  exception when others then
    if sqlerrm <> 'Store administrator required' then raise; end if;
  end;
  if has_table_privilege('corporate_private.enquiries','select,insert,update,delete') then
    raise exception 'Customer can access the enquiry table directly';
  end if;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub','7604d57c-daaa-4b84-b855-72491c179901',true);
set local role authenticated;
do $$
declare
  request_key uuid := gen_random_uuid();
  enquiry_id uuid;
  enquiry jsonb;
  old_stamp timestamptz;
  today date := (now() at time zone 'Africa/Johannesburg')::date;
begin
  if not exists (
    select 1 from jsonb_array_elements(public.corporate_quote_desk_enquiries('service','all',0,false)) e
    where e->>'topic'='Website request' and e->>'source'='website' and e->'quote_status'='null'
  ) then raise exception 'Existing website enquiry missing'; end if;

  enquiry_id := public.corporate_log_enquiry(request_key,'whatsapp','service','WhatsApp fixture',null,
    '+27821230000','Installation','Request for a quote',today - 1);
  if enquiry_id is distinct from public.corporate_log_enquiry(request_key,'whatsapp','service','WhatsApp fixture',null,
    '+27821230000','Installation','Request for a quote',today - 1) then
    raise exception 'Retry created a duplicate';
  end if;

  enquiry := public.corporate_quote_desk_enquiries('service','new',0,true)->0;
  if (enquiry->>'id')::uuid is distinct from enquiry_id
     or enquiry->>'source' is distinct from 'whatsapp'
     or (enquiry->>'assigned_to')::uuid is distinct from auth.uid()
     or enquiry ? 'request_key' then raise exception 'Manual enquiry, ownership or filter is wrong'; end if;
  old_stamp := (enquiry->>'updated_at')::timestamptz;

  perform public.corporate_set_enquiry_follow_up(enquiry_id,old_stamp,today + 2);
  if public.corporate_quote_desk_enquiries('service','new',0,true) <> '[]' then
    raise exception 'Rescheduled enquiry remains overdue';
  end if;

  begin
    perform public.corporate_save_enquiry_quote(enquiry_id,old_stamp,'draft',today+7,
      '[{"title":"Install","quantity":2,"unit_price_cents":15000}]');
    raise exception 'Stale edit succeeded';
  exception when others then if sqlerrm <> 'record_changed' then raise; end if; end;

  select e into enquiry from jsonb_array_elements(public.corporate_quote_desk_enquiries('service','new',0,false)) e
  where (e->>'id')::uuid=enquiry_id;
  begin
    perform public.corporate_save_enquiry_quote(enquiry_id,(enquiry->>'updated_at')::timestamptz,'draft',today+7,
      '[{"title":"Install","quantity":2,"unit_price_cents":-15000}]');
    raise exception 'Negative price was accepted';
  exception when others then if sqlerrm <> 'invalid_quote' then raise; end if; end;

  perform public.corporate_save_enquiry_quote(enquiry_id,(enquiry->>'updated_at')::timestamptz,'draft',today+7,
    '[{"title":"Install","quantity":2,"unit_price_cents":15000},{"title":"Delivery","quantity":1,"unit_price_cents":7500}]');
  select e into enquiry from jsonb_array_elements(public.corporate_quote_desk_enquiries('service','new',0,false)) e
  where (e->>'id')::uuid=enquiry_id;
  if (enquiry->>'quote_total_cents')::bigint is distinct from 37500 then raise exception 'Incorrect quote total'; end if;

  perform public.corporate_save_enquiry_quote(enquiry_id,(enquiry->>'updated_at')::timestamptz,'sent',null,null);
  enquiry := public.corporate_quote_desk_enquiries('service','in_progress',0,false)->0;
  begin
    perform public.corporate_save_enquiry_quote(enquiry_id,(enquiry->>'updated_at')::timestamptz,'draft',today+7,
      '[{"title":"New terms","quantity":1,"unit_price_cents":1}]');
    raise exception 'Sent quote could be edited';
  exception when others then if sqlerrm <> 'quote_locked' then raise; end if; end;

  perform public.corporate_save_enquiry_quote(enquiry_id,(enquiry->>'updated_at')::timestamptz,'accepted',null,null);
  enquiry := public.corporate_quote_desk_enquiries('service','in_progress',0,false)->0;
  if enquiry->>'quote_status' is distinct from 'accepted' or (enquiry->>'quote_total_cents')::bigint is distinct from 37500 then
    raise exception 'Acceptance did not preserve the quoted amount';
  end if;

  perform public.corporate_log_enquiry(gen_random_uuid(),'email','product','Email fixture','quote-email@example.invalid',
    null,'Email request','Please quote for two products',null);
  if public.corporate_quote_desk_enquiries('product','all',0,false)->0->>'source' is distinct from 'email' then
    raise exception 'Email enquiry missing';
  end if;
end;
$$;
reset role;

do $$
begin
  if (select count(*) from corporate_private.store_events where event_type='enquiry_quote') <> 3 then
    raise exception 'Quote audit events missing';
  end if;
end;
$$;

rollback;
