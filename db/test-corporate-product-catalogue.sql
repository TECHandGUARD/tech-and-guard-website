begin;
insert into auth.users (id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values ('ef64bdb7-27a6-44bb-b053-4d04941ce001','catalogue-staff@example.invalid',now(),'{}','{}'),
       ('ef64bdb7-27a6-44bb-b053-4d04941ce002','catalogue-buyer@example.invalid',now(),'{}','{}');
insert into corporate_private.staff_grants (email,staff_role) values ('catalogue-staff@example.invalid','staff');
select set_config('request.jwt.claim.sub','ef64bdb7-27a6-44bb-b053-4d04941ce002',true);
set local role authenticated;
do $$ begin
 begin
  perform public.corporate_save_catalogue_product('__catalogue_test','Fixture','',1000,'','',null);
  raise exception 'Customer was allowed to create a product';
 exception when others then
  if sqlerrm <> 'Store administrator required' then raise; end if;
 end;
end $$;
select set_config('request.jwt.claim.sub','ef64bdb7-27a6-44bb-b053-4d04941ce001',true);
do $$ declare
 result jsonb;
 stamp timestamptz;
begin
 result := public.corporate_save_catalogue_product('__catalogue_test','Fixture','Initial description',1000,'Blue','',null);
 if result->>'published' <> 'false' or result->>'options' <> 'Blue' or result->>'stock' is not null then
  raise exception 'Unexpected new product %',result;
 end if;
 stamp := (result->>'updated_at')::timestamptz;
 begin
  perform public.corporate_save_catalogue_product('__catalogue_test','Duplicate','',1000,'','',null);
  raise exception 'Duplicate SKU accepted';
 exception when others then if sqlerrm <> 'duplicate_product' then raise; end if;
 end;
 result := public.corporate_set_catalogue_visibility('__catalogue_test',true,stamp);
 stamp := (result->>'updated_at')::timestamptz;
 result := public.corporate_save_catalogue_product('__catalogue_test','Fixture updated','Updated',2000,'Green',
     'https://images.unsplash.com/example.png',stamp);
 if result->>'published' <> 'true' or result->>'price_cents' <> '2000' or result->>'options' <> 'Green' then
  raise exception 'Published product edit was not preserved %',result;
 end if;
 perform set_config('catalogue.test_stamp',result->>'updated_at',true);
 begin
  perform public.corporate_set_catalogue_visibility('__catalogue_test',false,stamp);
  raise exception 'Stale visibility update accepted';
 exception when others then if sqlerrm <> 'record_changed' then raise; end if;
 end;
end $$;
set local role anon;
do $$ begin
 if not exists (select 1 from public.corporate_products where sku='__catalogue_test' and price_cents=2000) then
  raise exception 'Published product missing from public catalogue';
 end if;
 if has_function_privilege('anon','public.corporate_save_catalogue_product(text,text,text,integer,text,text,timestamptz)','EXECUTE') then
  raise exception 'Anonymous user can execute admin save';
 end if;
end $$;
set local role authenticated;
select public.corporate_set_catalogue_visibility('__catalogue_test',false,current_setting('catalogue.test_stamp')::timestamptz);
set local role anon;
do $$ begin
 if exists (select 1 from public.corporate_products where sku='__catalogue_test') then
  raise exception 'Unpublished product visible to customer';
 end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from corporate_private.store_events where subject='__catalogue_test') <> 4 then
  raise exception 'Catalogue audit trail missing events';
 end if;
end $$;
rollback;
