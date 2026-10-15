-- Private, append-only stock history; all existing product/import paths are captured.
create table corporate_private.stock_movements (
 id uuid primary key default gen_random_uuid(), sku text not null,
 old_stock integer, new_stock integer,
 reason text not null, note text not null,
 actor uuid, actor_label text not null,
 request_key uuid, request_payload jsonb,
 created_at timestamptz not null default clock_timestamp(),
 unique(actor,request_key)
);
create index stock_movements_sku_created on corporate_private.stock_movements(sku,created_at desc,id desc);
alter table corporate_private.stock_movements enable row level security;
revoke all on corporate_private.stock_movements from public,anon,authenticated;
grant select on corporate_private.stock_movements to service_role;
create function corporate_private.capture_stock() returns trigger language plpgsql security definer set search_path='' as $$
declare context jsonb:=coalesce(nullif(current_setting('corporate.stock_context',true),''),'{}')::jsonb; previous integer;
begin
 if TG_OP='UPDATE' then previous:=old.stock; if old.stock is not distinct from new.stock and context='{}'::jsonb then return new;end if;end if;
 insert into corporate_private.stock_movements(sku,old_stock,new_stock,reason,note,actor,actor_label,request_key,request_payload)
 values(new.sku,previous,new.stock,coalesce(context->>'reason','catalogue_update'),coalesce(context->>'note','Product edit or CSV import'),auth.uid(),coalesce((select email from auth.users where id=auth.uid()),'System'),(context->>'key')::uuid,context->'payload');
 return new;
end;$$;
revoke all on function corporate_private.capture_stock() from public,anon,authenticated;
create trigger corporate_stock_history after insert or update of stock on public.corporate_products for each row execute function corporate_private.capture_stock();

create function corporate_private.adjust_stock(product_sku text,adjustment_reason text,quantity integer,adjustment_note text,expected_updated_at timestamptz,request_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.corporate_products; previous corporate_private.stock_movements; next_stock integer; payload jsonb;
begin
 if not corporate_private.is_admin() then raise exception 'Store administrator required';end if;
 if request_key is null or product_sku is null or adjustment_reason is null or adjustment_reason not in ('received','returned','damaged','lost','count') or quantity is null or quantity not between 0 and 1000000 or (adjustment_reason<>'count' and quantity=0) or adjustment_note is null or length(trim(adjustment_note)) not between 3 and 500 then raise exception 'invalid_adjustment';end if;
 payload:=jsonb_build_object('sku',product_sku,'reason',adjustment_reason,'quantity',quantity,'note',trim(adjustment_note),'expected',expected_updated_at);
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||request_key::text,1));
 select * into previous from corporate_private.stock_movements m where m.actor=auth.uid() and m.request_key=adjust_stock.request_key;
 if found then
  if previous.request_payload is distinct from payload then raise exception 'adjustment_changed';end if;
  return jsonb_build_object('id',previous.id,'sku',previous.sku,'old_stock',previous.old_stock,'new_stock',previous.new_stock);
 end if;
 select * into p from public.corporate_products where sku=product_sku for update;
 if not found or expected_updated_at is distinct from p.updated_at then raise exception 'record_changed';end if;
 if p.stock is null and adjustment_reason<>'count' then raise exception 'stock_unknown';end if;
 next_stock:=case when adjustment_reason='count' then quantity when adjustment_reason in ('received','returned') then p.stock+quantity else p.stock-quantity end;
 if next_stock not between 0 and 1000000 then raise exception 'stock_bounds';end if;
 perform set_config('corporate.stock_context',jsonb_build_object('reason',adjustment_reason,'note',trim(adjustment_note),'key',request_key,'payload',payload)::text,true);
 update public.corporate_products set stock=next_stock,updated_at=clock_timestamp() where sku=product_sku;
 perform set_config('corporate.stock_context','',true);
 select * into previous from corporate_private.stock_movements m where m.actor=auth.uid() and m.request_key=adjust_stock.request_key;
 return jsonb_build_object('id',previous.id,'sku',product_sku,'old_stock',p.stock,'new_stock',next_stock);
end;$$;
create function public.corporate_adjust_stock(product_sku text,adjustment_reason text,quantity integer,adjustment_note text,expected_updated_at timestamptz,request_key uuid)
returns jsonb language sql security invoker set search_path='' as $$select corporate_private.adjust_stock(product_sku,adjustment_reason,quantity,adjustment_note,expected_updated_at,request_key)$$;
create function corporate_private.stock_history(product_sku text,page_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not corporate_private.is_admin() then raise exception 'Store administrator required';end if;
 if product_sku is null or page_offset is null or page_offset<0 then raise exception 'invalid_adjustment';end if;
 return coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc,m.id desc) from (select id,sku,old_stock,new_stock,reason,note,actor_label,created_at from corporate_private.stock_movements where sku=product_sku order by created_at desc,id desc limit 50 offset page_offset) m),'[]'::jsonb);
end;$$;
create function public.corporate_stock_history(product_sku text,page_offset integer default 0)
returns jsonb language sql security invoker set search_path='' as $$select corporate_private.stock_history(product_sku,page_offset)$$;
revoke all on function corporate_private.adjust_stock(text,text,integer,text,timestamptz,uuid),public.corporate_adjust_stock(text,text,integer,text,timestamptz,uuid),corporate_private.stock_history(text,integer),public.corporate_stock_history(text,integer) from public,anon;
grant execute on function corporate_private.adjust_stock(text,text,integer,text,timestamptz,uuid),public.corporate_adjust_stock(text,text,integer,text,timestamptz,uuid),corporate_private.stock_history(text,integer),public.corporate_stock_history(text,integer) to authenticated;
