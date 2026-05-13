-- =========================================================
-- TONI – Auth V14 / Direktes Speichern von Registrierung
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

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
on profiles for insert
to authenticated
with check (
  id = auth.uid()
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

-- Admin-Adresse sicherstellen
create table if not exists admin_emails (
  email text primary key
);

insert into admin_emails (email)
values ('ralf.loskill@googlemail.com')
on conflict (email) do nothing;

-- Trigger bleibt erhalten: legt bei neuen Auth-Usern ein unvollständiges Profil an
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'student';
begin
  if exists (
    select 1
    from public.admin_emails
    where lower(email) = lower(new.email)
  ) then
    v_role := 'admin';
  end if;

  insert into public.profiles (
    id,
    display_name,
    email,
    class_name,
    role,
    password_set,
    profile_complete,
    force_password_change,
    is_active
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    '',
    v_role,
    false,
    false,
    true,
    true
  )
  on conflict (id) do update
  set email = excluded.email,
      role = case
        when exists (
          select 1
          from public.admin_emails
          where lower(email) = lower(new.email)
        )
        then 'admin'
        else public.profiles.role
      end,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();
