alter table corporate_private.enquiries
  add column source text not null default 'website' check (source in ('website', 'whatsapp', 'email')),
  add column contact_phone text check (contact_phone ~ '^\+[1-9][0-9]{6,14}$'),
  add column follow_up_on date,
  add column quote_status text check (quote_status in ('draft', 'sent', 'accepted', 'declined')),
  add column quote_valid_until date,
  add column quote_lines jsonb not null default '[]',
  add column quote_total_cents bigint not null default 0;

create index enquiries_open_follow_up on corporate_private.enquiries(follow_up_on, created_at, id)
  where status <> 'closed' and follow_up_on is not null;

create function corporate_private.quote_desk_enquiries(p_kind text, p_status text, p_offset integer, p_overdue boolean)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not corporate_private.is_admin() then raise exception 'Store administrator required'; end if;
  if p_kind is null or p_kind not in ('all', 'product', 'service')
     or p_status is null or p_status not in ('all', 'new', 'in_progress', 'closed')
     or p_offset is null or p_offset < 0 or p_overdue is null then
    raise exception 'invalid_enquiry';
  end if;

  return (select coalesce(jsonb_agg(to_jsonb(e) - array[
    'request_key', 'notification_attempts', 'notification_lock_at', 'notification_sent_at', 'notification_error_code'
  ] order by e.created_at desc, e.id desc), '[]'::jsonb)
  from (
    select * from corporate_private.enquiries
    where (p_kind = 'all' or kind = p_kind)
      and (p_status = 'all' or status = p_status)
      and (not p_overdue or (status <> 'closed' and follow_up_on < (now() at time zone 'Africa/Johannesburg')::date))
    order by created_at desc, id desc limit 50 offset p_offset
  ) e);
end;
$$;

create function corporate_private.log_enquiry(
  p_key uuid, p_source text, p_kind text, p_name text, p_email text, p_phone text,
  p_topic text, p_message text, p_follow_up_on date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := nullif(trim(p_phone), '');
  entry corporate_private.enquiries;
begin
  if not corporate_private.is_admin() then raise exception 'Store administrator required'; end if;
  if p_key is null or p_source is null or p_source not in ('whatsapp','email')
     or p_kind is null or p_kind not in ('product','service')
     or p_name is null or char_length(trim(p_name)) not between 1 and 120
     or char_length(v_email) > 254 or (v_email <> '' and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
     or (p_source = 'email' and v_email = '')
     or (p_source = 'whatsapp' and v_phone is null)
     or (v_phone is not null and v_phone !~ '^\+[1-9][0-9]{6,14}$')
     or p_topic is null or char_length(trim(p_topic)) not between 1 and 160
     or p_message is null or char_length(trim(p_message)) not between 1 and 2000
     or (p_follow_up_on is not null and not isfinite(p_follow_up_on)) then
    raise exception 'invalid_enquiry';
  end if;

  insert into corporate_private.enquiries(
    request_key, source, kind, customer_name, email, contact_phone, topic, message, assigned_to, follow_up_on
  ) values (
    p_key, p_source, p_kind, trim(p_name), v_email, v_phone, trim(p_topic), trim(p_message), auth.uid(), p_follow_up_on
  ) on conflict (request_key) do nothing returning * into entry;

  if found then
    insert into corporate_private.store_events(actor, event_type, subject, details)
    values (auth.uid(), 'enquiry_logged', entry.id::text, jsonb_build_object('source', p_source, 'kind', p_kind));
    return entry.id;
  end if;

  select * into entry from corporate_private.enquiries where request_key = p_key;
  if entry.source = p_source and entry.kind = p_kind and entry.customer_name = trim(p_name)
     and entry.email = v_email and entry.contact_phone is not distinct from v_phone
     and entry.topic = trim(p_topic) and entry.message = trim(p_message)
     and entry.follow_up_on is not distinct from p_follow_up_on
     and entry.assigned_to = auth.uid() then
    return entry.id;
  end if;
  raise exception 'enquiry_conflict';
end;
$$;

create function corporate_private.set_enquiry_follow_up(p_id uuid, p_updated_at timestamptz, p_follow_up_on date)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not corporate_private.is_admin() then raise exception 'Store administrator required'; end if;
  if p_follow_up_on is not null and not isfinite(p_follow_up_on) then raise exception 'invalid_enquiry'; end if;
  update corporate_private.enquiries
  set follow_up_on = p_follow_up_on, updated_at = greatest(clock_timestamp(), updated_at + interval '1 microsecond')
  where id = p_id and updated_at = p_updated_at;
  if not found then raise exception 'record_changed'; end if;
  insert into corporate_private.store_events(actor, event_type, subject, details)
  values (auth.uid(), 'enquiry_follow_up', p_id::text, jsonb_build_object('follow_up_on', p_follow_up_on));
  return true;
end;
$$;

create function corporate_private.save_enquiry_quote(
  p_id uuid, p_updated_at timestamptz, p_status text, p_valid_until date, p_lines jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  entry corporate_private.enquiries;
  line jsonb;
  title text;
  quantity integer;
  price integer;
  v_lines jsonb := '[]';
  v_total bigint := 0;
  today date := (now() at time zone 'Africa/Johannesburg')::date;
begin
  if not corporate_private.is_admin() then raise exception 'Store administrator required'; end if;
  select * into entry from corporate_private.enquiries where id = p_id for update;
  if not found or entry.updated_at is distinct from p_updated_at then raise exception 'record_changed'; end if;
  if entry.status = 'closed' then raise exception 'quote_locked'; end if;
  if p_status is null or p_status not in ('draft','sent','accepted','declined') then
    raise exception 'invalid_quote';
  end if;

  if p_status = 'draft' then
    if entry.quote_status is not null and entry.quote_status <> 'draft' then raise exception 'quote_locked'; end if;
    if p_valid_until is null or p_valid_until < today or not isfinite(p_valid_until)
       or jsonb_typeof(p_lines) is distinct from 'array' or octet_length(p_lines::text) > 25000 then
      raise exception 'invalid_quote';
    end if;
    if jsonb_array_length(p_lines) not between 1 and 20 then raise exception 'invalid_quote'; end if;
    for line in select value from jsonb_array_elements(p_lines) loop
      title := trim(line->>'title');
      if jsonb_typeof(line) is distinct from 'object'
         or title is null or char_length(title) not between 1 and 160
         or jsonb_typeof(line->'quantity') is distinct from 'number' or line->>'quantity' !~ '^[1-9][0-9]{0,2}$'
         or jsonb_typeof(line->'unit_price_cents') is distinct from 'number' or line->>'unit_price_cents' !~ '^[1-9][0-9]{0,8}$' then
        raise exception 'invalid_quote';
      end if;
      quantity := (line->>'quantity')::integer;
      price := (line->>'unit_price_cents')::integer;
      v_total := v_total + quantity::bigint * price;
      v_lines := v_lines || jsonb_build_object('title', title, 'quantity', quantity, 'unit_price_cents', price);
    end loop;
  else
    if p_valid_until is not null or p_lines is not null then raise exception 'invalid_quote'; end if;
    if (p_status = 'sent' and entry.quote_status is distinct from 'draft')
       or (p_status in ('accepted','declined') and entry.quote_status is distinct from 'sent') then
      raise exception 'quote_locked';
    end if;
    if p_status in ('sent','accepted') and entry.quote_valid_until < today then raise exception 'quote_expired'; end if;
    p_valid_until := entry.quote_valid_until;
    v_lines := entry.quote_lines;
    v_total := entry.quote_total_cents;
  end if;

  update corporate_private.enquiries
  set quote_status = p_status, quote_valid_until = p_valid_until, quote_lines = v_lines,
      quote_total_cents = v_total,
      status = case when p_status = 'sent' and status = 'new' then 'in_progress' else status end,
      updated_at = greatest(clock_timestamp(), updated_at + interval '1 microsecond')
  where id = p_id;

  insert into corporate_private.store_events(actor, event_type, subject, details)
  values (auth.uid(), 'enquiry_quote', p_id::text, jsonb_build_object('status', p_status, 'total_cents', v_total));
  return true;
end;
$$;

create function public.corporate_quote_desk_enquiries(p_kind text, p_status text, p_offset integer, p_overdue boolean)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select corporate_private.quote_desk_enquiries(p_kind, p_status, p_offset, p_overdue)
$$;
create function public.corporate_log_enquiry(
  p_key uuid, p_source text, p_kind text, p_name text, p_email text, p_phone text,
  p_topic text, p_message text, p_follow_up_on date
) returns uuid language sql security invoker set search_path = '' as $$
  select corporate_private.log_enquiry(p_key, p_source, p_kind, p_name, p_email, p_phone, p_topic, p_message, p_follow_up_on)
$$;
create function public.corporate_set_enquiry_follow_up(p_id uuid, p_updated_at timestamptz, p_follow_up_on date)
returns boolean language sql security invoker set search_path = '' as $$
  select corporate_private.set_enquiry_follow_up(p_id, p_updated_at, p_follow_up_on)
$$;
create function public.corporate_save_enquiry_quote(
  p_id uuid, p_updated_at timestamptz, p_status text, p_valid_until date, p_lines jsonb
) returns boolean language sql security invoker set search_path = '' as $$
  select corporate_private.save_enquiry_quote(p_id, p_updated_at, p_status, p_valid_until, p_lines)
$$;

revoke all on function
  corporate_private.quote_desk_enquiries(text,text,integer,boolean),
  corporate_private.log_enquiry(uuid,text,text,text,text,text,text,text,date),
  corporate_private.set_enquiry_follow_up(uuid,timestamptz,date),
  corporate_private.save_enquiry_quote(uuid,timestamptz,text,date,jsonb),
  public.corporate_quote_desk_enquiries(text,text,integer,boolean),
  public.corporate_log_enquiry(uuid,text,text,text,text,text,text,text,date),
  public.corporate_set_enquiry_follow_up(uuid,timestamptz,date),
  public.corporate_save_enquiry_quote(uuid,timestamptz,text,date,jsonb)
from public, anon;
grant execute on function
  corporate_private.quote_desk_enquiries(text,text,integer,boolean),
  corporate_private.log_enquiry(uuid,text,text,text,text,text,text,text,date),
  corporate_private.set_enquiry_follow_up(uuid,timestamptz,date),
  corporate_private.save_enquiry_quote(uuid,timestamptz,text,date,jsonb),
  public.corporate_quote_desk_enquiries(text,text,integer,boolean),
  public.corporate_log_enquiry(uuid,text,text,text,text,text,text,text,date),
  public.corporate_set_enquiry_follow_up(uuid,timestamptz,date),
  public.corporate_save_enquiry_quote(uuid,timestamptz,text,date,jsonb)
to authenticated;
