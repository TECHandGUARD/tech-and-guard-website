create schema if not exists corporate_private;
revoke all on schema corporate_private from public,anon,authenticated;
grant usage on schema corporate_private to authenticated,service_role;
create table corporate_private.store_admins(user_id uuid primary key references auth.users(id) on delete cascade);
alter table corporate_private.store_admins enable row level security;
revoke all on corporate_private.store_admins from public,anon,authenticated;
grant all on corporate_private.store_admins to service_role;
create function corporate_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from corporate_private.store_admins where user_id=auth.uid())$$;
create function public.corporate_is_admin() returns boolean language sql stable security invoker set search_path='' as $$select corporate_private.is_admin()$$;
revoke all on function corporate_private.is_admin(),public.corporate_is_admin() from public,anon;
grant execute on function corporate_private.is_admin(),public.corporate_is_admin() to authenticated;
create table public.corporate_products(
 sku text primary key check(length(sku) between 1 and 160),handle text not null default '',
 title text not null check(length(title) between 1 and 300),description text not null default '' check(length(description)<=10000),
 price_cents integer not null check(price_cents>0),stock integer check(stock between 0 and 1000000),
 image_url text not null default '' check(image_url='' or image_url ~ '^https://[^/@]+(/|$)'),options text not null default '',
 published boolean not null default false,updated_at timestamptz not null default now()
);
alter table public.corporate_products enable row level security;
revoke all on public.corporate_products from public,anon,authenticated;
grant select on public.corporate_products to anon,authenticated;
grant update(published) on public.corporate_products to authenticated;
grant all on public.corporate_products to service_role;
create policy "Public published catalogue" on public.corporate_products for select to anon using(published);
create policy "Catalogue and admin drafts" on public.corporate_products for select to authenticated using(published or corporate_private.is_admin());
create policy "Admin publication" on public.corporate_products for update to authenticated using(corporate_private.is_admin()) with check(corporate_private.is_admin());
create table corporate_private.import_log(id uuid primary key default gen_random_uuid(),actor uuid not null,variant_count integer not null,created_at timestamptz default now());
alter table corporate_private.import_log enable row level security;
revoke all on corporate_private.import_log from public,anon,authenticated;
grant all on corporate_private.import_log to service_role;
create function corporate_private.import_products(items jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare item jsonb; count_items integer;
begin
 if not corporate_private.is_admin() then raise exception 'Store administrator required';end if;
 if jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 2000 or octet_length(items::text)>5242880 then raise exception 'Import 1 to 2000 validated variants';end if;
 if exists(select 1 from jsonb_array_elements(items) x group by x->>'sku' having count(*)>1) then raise exception 'Duplicate SKU';end if;
 for item in select * from jsonb_array_elements(items) loop
  if jsonb_typeof(item)<>'object' or item->>'sku' is null or item->>'title' is null or not (item->>'price_cents' ~ '^[0-9]+$') then raise exception 'Invalid product fields';end if;
  insert into public.corporate_products(sku,handle,title,description,price_cents,stock,image_url,options,published)
  values(item->>'sku',coalesce(item->>'handle',''),item->>'title',coalesce(item->>'description',''),(item->>'price_cents')::integer,(item->>'stock')::integer,coalesce(item->>'image_url',''),coalesce(item->>'options',''),false)
  on conflict(sku) do update set handle=excluded.handle,title=excluded.title,description=excluded.description,price_cents=excluded.price_cents,stock=excluded.stock,image_url=excluded.image_url,options=excluded.options,published=false,updated_at=now();
 end loop;
 count_items:=jsonb_array_length(items);
 insert into corporate_private.import_log(actor,variant_count) values(auth.uid(),count_items);return count_items;
end;$$;
create function public.corporate_import_products(items jsonb) returns integer language sql security invoker set search_path='' as $$select corporate_private.import_products(items)$$;
revoke all on function public.corporate_import_products(jsonb),corporate_private.import_products(jsonb) from public,anon;
grant execute on function public.corporate_import_products(jsonb),corporate_private.import_products(jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('corporate-theme-uploads','corporate-theme-uploads',false,20971520,array['application/zip']);
create policy "Store admins upload private themes" on storage.objects for insert to authenticated with check(bucket_id='corporate-theme-uploads' and corporate_private.is_admin());
create policy "Store admins read private themes" on storage.objects for select to authenticated using(bucket_id='corporate-theme-uploads' and corporate_private.is_admin());
