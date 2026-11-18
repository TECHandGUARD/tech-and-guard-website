insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('corporate-product-images', 'corporate-product-images', true, 5242880,
        array['image/jpeg','image/png','image/webp']);

create policy "Store administrators upload product images" on storage.objects
for insert to authenticated
with check (bucket_id = 'corporate-product-images' and corporate_private.is_admin());

create function corporate_private.save_catalogue_product(
  sku text, title text, description text, price_cents integer, options text, image_url text,
  expected_updated_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  saved public.corporate_products;
  product_key text := trim(sku);
begin
  if not corporate_private.is_admin() then raise exception 'Store administrator required'; end if;
  if product_key is null or length(product_key) not between 1 and 160
     or title is null or length(trim(title)) not between 1 and 300
     or description is null or length(description) > 10000
     or price_cents is null or price_cents <= 0
     or options is null or length(options) > 1000
     or image_url is null or length(image_url) > 2000
     or (image_url <> '' and image_url !~ '^https://[^/@?#]+(/|$)') then
    raise exception 'invalid_product';
  end if;

  if expected_updated_at is null then
    insert into public.corporate_products (sku, title, description, price_cents, options, image_url)
    values (product_key, trim(title), description, price_cents, options, image_url)
    on conflict on constraint corporate_products_pkey do nothing
    returning * into saved;
    if not found then raise exception 'duplicate_product'; end if;
  else
    update public.corporate_products p
    set title = trim(save_catalogue_product.title),
        description = save_catalogue_product.description,
        price_cents = save_catalogue_product.price_cents,
        options = save_catalogue_product.options,
        image_url = save_catalogue_product.image_url,
        updated_at = greatest(clock_timestamp(), p.updated_at + interval '1 microsecond')
    where p.sku = product_key and p.updated_at = expected_updated_at
    returning p.* into saved;
    if not found then raise exception 'record_changed'; end if;
  end if;

  insert into corporate_private.store_events (actor, event_type, subject, details)
  values (auth.uid(), case when expected_updated_at is null then 'product_created' else 'product_edited' end,
          saved.sku, jsonb_build_object('price_cents', saved.price_cents));
  return to_jsonb(saved);
end;
$$;

create function corporate_private.set_catalogue_visibility(sku text, published boolean, expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.corporate_products;
begin
  if not corporate_private.is_admin() then raise exception 'Store administrator required'; end if;
  if published is null or expected_updated_at is null then raise exception 'invalid_product'; end if;
  update public.corporate_products p
  set published = set_catalogue_visibility.published, updated_at = greatest(clock_timestamp(), p.updated_at + interval '1 microsecond')
  where p.sku = set_catalogue_visibility.sku and p.updated_at = expected_updated_at
  returning p.* into saved;
  if not found then raise exception 'record_changed'; end if;

  insert into corporate_private.store_events (actor, event_type, subject, details)
  values (auth.uid(), case when saved.published then 'product_published' else 'product_unpublished' end,
          saved.sku, '{}'::jsonb);
  return to_jsonb(saved);
end;
$$;

create function public.corporate_save_catalogue_product(
  sku text, title text, description text, price_cents integer, options text, image_url text,
  expected_updated_at timestamptz
) returns jsonb language sql security invoker set search_path = '' as $$
  select corporate_private.save_catalogue_product(sku, title, description, price_cents, options, image_url, expected_updated_at)
$$;

create function public.corporate_set_catalogue_visibility(sku text, published boolean, expected_updated_at timestamptz)
returns jsonb language sql security invoker set search_path = '' as $$
  select corporate_private.set_catalogue_visibility(sku, published, expected_updated_at)
$$;

revoke all on function
  corporate_private.save_catalogue_product(text,text,text,integer,text,text,timestamptz),
  corporate_private.set_catalogue_visibility(text,boolean,timestamptz),
  public.corporate_save_catalogue_product(text,text,text,integer,text,text,timestamptz),
  public.corporate_set_catalogue_visibility(text,boolean,timestamptz)
from public, anon;

grant execute on function
  corporate_private.save_catalogue_product(text,text,text,integer,text,text,timestamptz),
  corporate_private.set_catalogue_visibility(text,boolean,timestamptz),
  public.corporate_save_catalogue_product(text,text,text,integer,text,text,timestamptz),
  public.corporate_set_catalogue_visibility(text,boolean,timestamptz)
to authenticated;
