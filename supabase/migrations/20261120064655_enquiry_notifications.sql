alter table corporate_private.enquiries
  add column notification_status text not null default 'not_configured'
    check (notification_status in ('not_configured','sending','sent','failed')),
  add column notification_attempts integer not null default 0 check (notification_attempts between 0 and 5),
  add column notification_lock_at timestamptz,
  add column notification_sent_at timestamptz,
  add column notification_error_code text;

create table corporate_private.enquiry_notification_limits (
  ip_hash text primary key check (ip_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts between 1 and 3)
);
create index corporate_enquiry_notification_limits_window
  on corporate_private.enquiry_notification_limits(window_started_at);
alter table corporate_private.enquiry_notification_limits enable row level security;
revoke all on corporate_private.enquiry_notification_limits from public,anon,authenticated;
grant all on corporate_private.enquiry_notification_limits to service_role;

create function corporate_private.claim_enquiry_notification(p_id uuid,p_email text,p_ip_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  entry corporate_private.enquiries;
  rate corporate_private.enquiry_notification_limits;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required'; end if;
  if p_id is null or p_email is null or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_enquiry_notification';
  end if;
  select * into entry from corporate_private.enquiries where id=p_id for update;
  if not found or entry.email is distinct from lower(trim(p_email)) then raise exception 'enquiry_not_found'; end if;
  if entry.notification_status='sent' then return jsonb_build_object('status','sent','already_sent',true); end if;
  if entry.notification_attempts>=5 then return jsonb_build_object('status','failed','attempt_limit',true); end if;
  if entry.notification_status='sending' and entry.notification_lock_at>now()-interval '5 minutes' then
    return jsonb_build_object('status','sending','already_sending',true);
  end if;

  delete from corporate_private.enquiry_notification_limits where window_started_at<=now()-interval '1 day';
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash,747509034));
  select * into rate from corporate_private.enquiry_notification_limits where ip_hash=p_ip_hash for update;
  if found and rate.window_started_at>now()-interval '1 hour' and rate.attempts>=3 then
    return jsonb_build_object('status','not_configured','rate_limited',true);
  end if;
  if not found then
    insert into corporate_private.enquiry_notification_limits(ip_hash,window_started_at,attempts)
      values(p_ip_hash,now(),1);
  elsif rate.window_started_at<=now()-interval '1 hour' then
    update corporate_private.enquiry_notification_limits set window_started_at=now(),attempts=1 where ip_hash=p_ip_hash;
  else
    update corporate_private.enquiry_notification_limits set attempts=attempts+1 where ip_hash=p_ip_hash;
  end if;

  update corporate_private.enquiries set notification_status='sending',notification_attempts=notification_attempts+1,
    notification_lock_at=now(),notification_error_code=null where id=p_id returning * into entry;
  return jsonb_build_object('status','sending','id',entry.id,'kind',entry.kind,'customer_name',entry.customer_name,
    'email',entry.email,'topic',entry.topic,'message',entry.message,'items',entry.items,'created_at',entry.created_at);
end;
$$;

create function corporate_private.complete_enquiry_notification(p_id uuid,p_sent boolean,p_error_code text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required'; end if;
  if p_id is null or p_sent is null then raise exception 'invalid_enquiry_notification'; end if;
  update corporate_private.enquiries set notification_status=case when p_sent then 'sent' else 'failed' end,
    notification_sent_at=case when p_sent then now() else notification_sent_at end,
    notification_lock_at=null,notification_error_code=case when p_sent then null else left(coalesce(p_error_code,'provider_unavailable'),64) end
  where id=p_id and notification_status='sending';
  return found;
end;
$$;

create function public.corporate_claim_enquiry_notification(p_id uuid,p_email text,p_ip_hash text)
returns jsonb language sql security invoker set search_path='' as $$
  select corporate_private.claim_enquiry_notification(p_id,p_email,p_ip_hash)
$$;
create function public.corporate_complete_enquiry_notification(p_id uuid,p_sent boolean,p_error_code text default null)
returns boolean language sql security invoker set search_path='' as $$
  select corporate_private.complete_enquiry_notification(p_id,p_sent,p_error_code)
$$;

revoke all on function corporate_private.claim_enquiry_notification(uuid,text,text),
  corporate_private.complete_enquiry_notification(uuid,boolean,text),
  public.corporate_claim_enquiry_notification(uuid,text,text),
  public.corporate_complete_enquiry_notification(uuid,boolean,text) from public,anon,authenticated;
grant execute on function corporate_private.claim_enquiry_notification(uuid,text,text),
  corporate_private.complete_enquiry_notification(uuid,boolean,text),
  public.corporate_claim_enquiry_notification(uuid,text,text),
  public.corporate_complete_enquiry_notification(uuid,boolean,text) to service_role;
