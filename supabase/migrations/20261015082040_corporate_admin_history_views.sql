-- Read-only administrative views over existing private history, via guarded RPCs.
create function corporate_private.inventory_history(product_sku text default null,page_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not corporate_private.is_admin() then raise exception 'Store administrator required';end if;
 if page_offset is null or page_offset<0 or page_offset>1000000 or (product_sku is not null and length(product_sku)>160) then raise exception 'invalid_adjustment';end if;
 return coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc,m.id desc) from
 (select id,sku,old_stock,new_stock,reason,note,actor_label,created_at from corporate_private.stock_movements
 where product_sku is null or sku=product_sku order by created_at desc,id desc limit 50 offset page_offset) m),'[]'::jsonb);
end;$$;
create function public.corporate_inventory_history(product_sku text default null,page_offset integer default 0)
returns jsonb language sql security invoker set search_path='' as $$select corporate_private.inventory_history(product_sku,page_offset)$$;
create function corporate_private.admin_events(page_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if corporate_private.staff_role() is distinct from 'owner' then raise exception 'Owner administrator required';end if;
 if page_offset is null or page_offset<0 or page_offset>1000000 then raise exception 'invalid_adjustment';end if;
 return coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc,e.id desc) from
 (select e.id,e.created_at,e.event_type,e.subject,coalesce(u.email,'Deleted account') as actor_label
 from corporate_private.store_events e left join auth.users u on u.id=e.actor order by e.created_at desc,e.id desc limit 50 offset page_offset) e),'[]'::jsonb);
end;$$;
create function public.corporate_admin_events(page_offset integer default 0)
returns jsonb language sql security invoker set search_path='' as $$select corporate_private.admin_events(page_offset)$$;
revoke all on function corporate_private.inventory_history(text,integer),public.corporate_inventory_history(text,integer),corporate_private.admin_events(integer),public.corporate_admin_events(integer) from public,anon;
grant execute on function corporate_private.inventory_history(text,integer),public.corporate_inventory_history(text,integer),corporate_private.admin_events(integer),public.corporate_admin_events(integer) to authenticated;
