begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values ('bd93eca0-026b-43d9-a481-70e399dd16af','enquiry-staff@example.invalid',now(),'{}','{}');
insert into corporate_private.staff_grants(email,staff_role) values ('enquiry-staff@example.invalid','staff');
insert into public.corporate_products(sku,title,price_cents,stock,published)
values ('__enquiry_product','Fixture accessory',10000,3,true),('__enquiry_hidden','Hidden fixture',10000,3,false);
set local role anon;
do $$ declare first_id uuid; again uuid;
begin
 if not public.corporate_enquiry_intake_ready() then raise exception 'Intake disabled'; end if;
 first_id:=public.corporate_submit_enquiry('02da8980-2600-4248-8998-d886ba2a69fc','product','Test shopper','buyer@example.invalid','Accessories','Cape Town','[{"sku":"__enquiry_product","quantity":2}]');
 again:=public.corporate_submit_enquiry('02da8980-2600-4248-8998-d886ba2a69fc','product','Test shopper','buyer@example.invalid','Accessories','Cape Town','[{"sku":"__enquiry_product","quantity":2}]');
 if first_id is distinct from again then raise exception 'Retry created a duplicate'; end if;
 perform set_config('test.enquiry_id',first_id::text,true);
 perform public.corporate_submit_enquiry(gen_random_uuid(),'service','Test service lead','lead@example.invalid','Business websites','Need a quote','[]');
 if has_function_privilege('anon','public.corporate_list_enquiries(text,text,integer)','EXECUTE')
  or has_function_privilege('anon','public.corporate_update_enquiry(uuid,text,boolean,timestamptz)','EXECUTE')
 then raise exception 'Anonymous requester can access private enquiry operations'; end if;
 begin
  perform public.corporate_submit_enquiry(gen_random_uuid(),'product','Test shopper','buyer@example.invalid','Accessories','Cape Town','[{"sku":"__enquiry_hidden","quantity":2}]');
  raise exception 'Hidden product accepted';
 exception when others then if sqlerrm<>'catalogue_changed' then raise; end if; end;
end $$;

select set_config('request.jwt.claim.sub','bd93eca0-026b-43d9-a481-70e399dd16af',true);
set local role authenticated;
do $$ declare entry jsonb;
begin
 entry:=public.corporate_list_enquiries('product','new',0)->0;
 if entry->>'id' is distinct from current_setting('test.enquiry_id') or entry->'items'->0->>'title' is distinct from 'Fixture accessory'
  or entry?'request_key' then raise exception 'Unexpected queue payload'; end if;
 perform public.corporate_update_enquiry((entry->>'id')::uuid,'in_progress',true,(entry->>'updated_at')::timestamptz);
 if public.corporate_list_enquiries('product','in_progress',0)->0->>'assigned_to' is distinct from auth.uid()::text
 then raise exception 'Enquiry assignment not recorded'; end if;
 begin
  perform public.corporate_update_enquiry((entry->>'id')::uuid,'closed',false,(entry->>'updated_at')::timestamptz);
  raise exception 'Stale update accepted';
 exception when others then if sqlerrm<>'record_changed' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from corporate_private.enquiries)<>2 then raise exception 'Unexpected enquiry total'; end if;
end $$;
rollback;
