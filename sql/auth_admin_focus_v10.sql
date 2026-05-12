-- =========================================================
-- TONI – Auth V10 / Fokus Admin-Anmeldung
-- Bitte komplett in Supabase SQL Editor ausführen.
-- =========================================================

alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;
alter table profiles add column if not exists password_set boolean not null default false;
alter table profiles add column if not exists profile_complete boolean not null default false;
alter table profiles add column if not exists force_password_change boolean not null default false;

alter table profiles enable row level security;

create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
on profiles for select
to authenticated
using (
  id = auth.uid()
  or public.get_my_role() = 'admin'
);

drop policy if exists "profiles_update_own_incomplete" on profiles;
create policy "profiles_update_own_incomplete"
on profiles for update
to authenticated
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);

drop policy if exists "profiles_anon_check_completed_email" on profiles;
create policy "profiles_anon_check_completed_email"
on profiles for select
to anon
using (
  is_active = true
  and profile_complete = true
);

create table if not exists admin_emails (
  email text primary key
);

insert into admin_emails (email)
values ('ralf.loskill@googlemail.com')
on conflict (email) do nothing;

-- Admin-Profil sauber setzen, falls es bereits existiert.
update profiles
set
  role = 'admin',
  profile_complete = true,
  password_set = true,
  force_password_change = false,
  first_name = coalesce(first_name, 'Ralf'),
  last_name = coalesce(last_name, 'Loskill'),
  display_name = 'Ralf Loskill',
  updated_at = now()
where lower(email) = 'ralf.loskill@googlemail.com';

-- Prüfen:
-- select email, role, profile_complete, password_set, force_password_change
-- from profiles
-- where lower(email) = 'ralf.loskill@googlemail.com';
