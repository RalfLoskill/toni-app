-- =========================================================
-- TONI – Auth V7.1 / Fix Registrierung abschließen
-- Bitte komplett in Supabase SQL Editor ausführen.
-- =========================================================

alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;
alter table profiles add column if not exists password_set boolean not null default false;
alter table profiles add column if not exists profile_complete boolean not null default false;
alter table profiles add column if not exists force_password_change boolean not null default false;

create table if not exists admin_emails (email text primary key);
insert into admin_emails (email) values ('ralf.loskill@googlemail.com') on conflict (email) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_role text := 'student';
begin
  if exists (select 1 from public.admin_emails where lower(email)=lower(new.email)) then
    v_role := 'admin';
  end if;

  insert into public.profiles (
    id, display_name, email, class_name, role,
    password_set, profile_complete, force_password_change
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    new.email,
    '',
    v_role,
    false,
    false,
    true
  )
  on conflict (id) do update
  set email=excluded.email,
      role=case
        when exists (select 1 from public.admin_emails where lower(email)=lower(new.email))
        then 'admin'
        else public.profiles.role
      end,
      updated_at=now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.check_profile_exists_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_exists boolean := false;
begin
  select exists (
    select 1
    from public.profiles
    where lower(email)=lower(trim(p_email))
      and is_active=true
      and profile_complete=true
  ) into v_exists;

  return jsonb_build_object('exists',v_exists);
end;
$$;

grant execute on function public.check_profile_exists_by_email(text) to anon;
grant execute on function public.check_profile_exists_by_email(text) to authenticated;

create or replace function public.complete_my_profile(
  p_first_name text,
  p_last_name text,
  p_class_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_display_name text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_display_name := trim(coalesce(p_first_name,'') || ' ' || coalesce(p_last_name,''));

  if length(v_display_name) < 2 then
    raise exception 'name_required';
  end if;

  update public.profiles
  set first_name=trim(p_first_name),
      last_name=trim(p_last_name),
      display_name=v_display_name,
      class_name=coalesce(trim(p_class_name),''),
      password_set=true,
      profile_complete=true,
      force_password_change=false,
      updated_at=now()
  where id=auth.uid();

  if not found then
    raise exception 'profile_not_found';
  end if;

  return jsonb_build_object(
    'ok',true,
    'profile_id',auth.uid(),
    'display_name',v_display_name
  );
end;
$$;

grant execute on function public.complete_my_profile(text,text,text) to authenticated;

create or replace function public.mark_my_password_set()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set password_set=true,
      force_password_change=false,
      updated_at=now()
  where id=auth.uid();

  return jsonb_build_object('ok',true,'profile_id',auth.uid());
end;
$$;

grant execute on function public.mark_my_password_set() to authenticated;

-- Leserechte für das eigene Profil sicherstellen
alter table profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
on profiles for select
using (
  id = auth.uid()
  or public.get_my_role() = 'admin'
);
