begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values(gen_random_uuid(),'orders-buyer-fixture@example.invalid',now(),'{}','{}'),(gen_random_uuid(),'orders-other-fixture@example.invalid',now(),'{}','{}'),(gen_random_uuid(),'orders-owner-fixture@example.invalid',now(),'{}','{}'),(gen_random_uuid(),'orders-unverified-fixture@example.invalid',null,'{}','{}');
insert into corporate_private.staff_grants(email,staff_role) values('orders-owner-fixture@example.invalid','owner');
insert into public.corporate_products(sku,title,price_cents,stock,published) values('__tg_orders_fixture','Fixture product',1000,10,true),('__tg_hidden_fixture','Hidden fixture',1000,10,false);
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='orders-buyer-fixture@example.invalid'),true);
select set_config('test.order_key',gen_random_uuid()::text,true);
set local role authenticated;
do $$declare result jsonb;again jsonb;begin
 result:=public.corporate_create_order_request('[{"sku":"__tg_orders_fixture","quantity":2,"price_cents":1}]','Fixture buyer','Town only',current_setting('test.order_key')::uuid);
 if (result->>'subtotal_cents')::integer<>2000 then raise exception 'Client price was trusted';end if;
 perform set_config('test.order_id',result->>'id',true);
 again:=public.corporate_create_order_request('[{"sku":"__tg_orders_fixture","quantity":2,"price_cents":1}]','Fixture buyer','Town only',current_setting('test.order_key')::uuid);
 if result<>again or (select count(*) from public.corporate_orders)<>1 then raise exception 'Retry duplicated request';end if;
 if (select stock from public.corporate_products where sku='__tg_orders_fixture')<>10 then raise exception 'Request reserved inventory';end if;
 begin perform public.corporate_create_order_request('[{"sku":"__tg_orders_fixture","quantity":3}]','Fixture buyer','Town only',current_setting('test.order_key')::uuid);raise exception 'Changed retry accepted';exception when others then if sqlerrm<>'request_changed' then raise;end if;end;
 begin perform public.corporate_create_order_request('[{"sku":"__tg_hidden_fixture","quantity":1}]','Fixture buyer','',gen_random_uuid());raise exception 'Hidden product accepted';exception when others then if sqlerrm<>'catalogue_changed' then raise;end if;end;
 begin perform public.corporate_create_order_request('[{"sku":"__tg_orders_fixture","quantity":11}]','Fixture buyer','',gen_random_uuid());raise exception 'Insufficient stock accepted';exception when others then if sqlerrm<>'catalogue_changed' then raise;end if;end;
 begin perform public.corporate_create_order_request('[{"sku":"__tg_orders_fixture","quantity":0}]','Fixture buyer','',gen_random_uuid());raise exception 'Zero quantity accepted';exception when others then if sqlerrm<>'invalid_request' then raise;end if;end;
 begin perform public.corporate_create_order_request('[{"sku":"__tg_orders_fixture","quantity":1},{"sku":"__tg_orders_fixture","quantity":1}]','Fixture buyer','',gen_random_uuid());raise exception 'Duplicate lines accepted';exception when others then if sqlerrm<>'invalid_request' then raise;end if;end;
 begin perform public.corporate_review_order_request((result->>'id')::uuid,'reviewed',now());raise exception 'Buyer reviewed request';exception when others then if sqlerrm<>'Store administrator required' then raise;end if;end;
 begin perform public.corporate_edit_product('__tg_orders_fixture','Hacked','',1,10,now());raise exception 'Buyer edited product';exception when others then if sqlerrm<>'Store administrator required' then raise;end if;end;
 for i in 1..4 loop perform public.corporate_create_order_request('[{"sku":"__tg_orders_fixture","quantity":1}]','Fixture buyer','',gen_random_uuid());end loop;
 begin perform public.corporate_create_order_request('[{"sku":"__tg_orders_fixture","quantity":1}]','Fixture buyer','',gen_random_uuid());raise exception 'Daily limit bypassed';exception when others then if sqlerrm<>'request_limit' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='orders-other-fixture@example.invalid'),true);
set local role authenticated;
do $$begin if exists(select 1 from public.corporate_orders) then raise exception 'Other customer can read orders';end if;end;$$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='orders-unverified-fixture@example.invalid'),true);
set local role authenticated;
do $$begin
 begin perform public.corporate_create_order_request('[{"sku":"__tg_orders_fixture","quantity":1}]','Unverified','',gen_random_uuid());raise exception 'Unverified request accepted';exception when others then if sqlerrm<>'verified_account_required' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='orders-owner-fixture@example.invalid'),true);
set local role authenticated;
do $$declare stamp timestamptz;begin
 select updated_at into stamp from public.corporate_products where sku='__tg_orders_fixture';
 perform public.corporate_edit_product('__tg_orders_fixture','Edited fixture','New description',1500,9,stamp);
 begin perform public.corporate_edit_product('__tg_orders_fixture','Stale','',1,10,stamp);raise exception 'Stale product update accepted';exception when others then if sqlerrm<>'record_changed' then raise;end if;end;
 if (select subtotal_cents from public.corporate_orders where id=current_setting('test.order_id')::uuid)<>2000 then raise exception 'Order price snapshot changed';end if;
 select updated_at into stamp from public.corporate_orders where id=current_setting('test.order_id')::uuid;
 begin perform public.corporate_review_order_request(current_setting('test.order_id')::uuid,'paid',stamp);raise exception 'Manual paid status accepted';exception when others then if sqlerrm<>'invalid_status' then raise;end if;end;
 perform public.corporate_review_order_request(current_setting('test.order_id')::uuid,'reviewed',stamp);
 begin perform public.corporate_review_order_request(current_setting('test.order_id')::uuid,'cancelled',stamp);raise exception 'Stale order update accepted';exception when others then if sqlerrm<>'record_changed' then raise;end if;end;
 select updated_at into stamp from public.corporate_orders where id=current_setting('test.order_id')::uuid;
 perform public.corporate_review_order_request(current_setting('test.order_id')::uuid,'cancelled',stamp);
end;$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.corporate_create_order_request(jsonb,text,text,uuid)','execute') or has_table_privilege('anon','public.corporate_orders','select') or has_table_privilege('authenticated','public.corporate_orders','insert') or has_table_privilege('authenticated','corporate_private.store_events','select') then raise exception 'Order permission exposure';end if;
 if not exists(select 1 from corporate_private.store_events where subject=current_setting('test.order_id') and event_type='order_status') then raise exception 'Status event not audited';end if;
end;$$;
rollback;
