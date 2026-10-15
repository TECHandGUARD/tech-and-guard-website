create table corporate_private.staff_grants (
 email text primary key check(email=lower(email) and length(email)<=254),
 staff_role text not null check(staff_role in ('owner','staff')),
 granted_by uuid references auth.users(id), created_at timestamptz not null default now()
);
alter table corporate_private.staff_grants enable row level security;
revoke all on corporate_private.staff_grants from public,anon,authenticated;
grant all on corporate_private.staff_grants to service_role;
create function corporate_private.staff_role() returns text language sql stable security definer set search_path='' as $$
 select g.staff_role from corporate_private.staff_grants g join auth.users u on lower(u.email)=g.email
 where u.id=auth.uid() and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now())
$$;
revoke all on function corporate_private.staff_role() from public,anon;
grant execute on function corporate_private.staff_role() to authenticated;
create or replace function corporate_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (corporate_private.staff_role() is not null or exists(select 1 from corporate_private.store_admins where user_id=auth.uid()))
$$;
create function public.corporate_staff_role() returns text language sql stable security invoker set search_path='' as $$select corporate_private.staff_role()$$;
create function corporate_private.list_staff() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if corporate_private.staff_role() is distinct from 'owner' then raise exception 'Owner administrator required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('email',g.email,'role',g.staff_role,'verified',exists(select 1 from auth.users u where lower(u.email)=g.email and u.email_confirmed_at is not null)) order by g.email) from corporate_private.staff_grants g),'[]'::jsonb);
end;$$;
create function public.corporate_list_staff() returns jsonb language sql security invoker set search_path='' as $$select corporate_private.list_staff()$$;
create function corporate_private.set_staff(staff_email text,enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare target_email text:=lower(trim(staff_email));
begin
 if corporate_private.staff_role() is distinct from 'owner' then raise exception 'Owner administrator required';end if;
 if target_email is null or enabled is null then raise exception 'Email and action required';end if;
 if exists(select 1 from corporate_private.staff_grants where email=target_email and staff_role='owner') then raise exception 'Owner accounts cannot be changed by staff assignment';end if;
 if enabled then
  if not exists(select 1 from auth.users where lower(email)=target_email and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Staff must register and verify their email first';end if;
  insert into corporate_private.staff_grants(email,staff_role,granted_by) values(target_email,'staff',auth.uid()) on conflict(email) do nothing;
 else delete from corporate_private.staff_grants where email=target_email and staff_role='staff';end if;
end;$$;
create function public.corporate_set_staff(staff_email text,enabled boolean) returns void language sql security invoker set search_path='' as $$select corporate_private.set_staff(staff_email,enabled)$$;
revoke all on function public.corporate_staff_role(),public.corporate_list_staff(),public.corporate_set_staff(text,boolean),corporate_private.list_staff(),corporate_private.set_staff(text,boolean) from public,anon;
grant execute on function public.corporate_staff_role(),public.corporate_list_staff(),public.corporate_set_staff(text,boolean),corporate_private.list_staff(),corporate_private.set_staff(text,boolean) to authenticated;
