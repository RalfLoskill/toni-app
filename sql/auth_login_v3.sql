-- =========================================================
-- TONI – Auth / Login V3
-- Echte Anmeldung mit Supabase Auth + Rollenprofilen
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Profile an Auth-User koppeln
-- Für neue Login-Nutzer entspricht profiles.id = auth.users.id
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key,
  display_name text not null,
  email text unique,
  class_name text,
  role text not null default 'student',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint profiles_role_check check (role in ('student', 'tutor', 'admin'))
);

create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_email on profiles(email);

-- ---------------------------------------------------------
-- Profil automatisch beim ersten Auth-Signup anlegen
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    email,
    class_name,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    '',
    'student'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- Rollen-Hilfsfunktion für RLS
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- RLS für profiles
-- ---------------------------------------------------------
alter table profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_admin" on profiles;

create policy "profiles_select_own_or_admin"
on profiles for select
using (
  id = auth.uid()
  or public.get_my_role() = 'admin'
);

create policy "profiles_insert_own"
on profiles for insert
with check (
  id = auth.uid()
);

create policy "profiles_update_admin"
on profiles for update
using (
  public.get_my_role() = 'admin'
)
with check (
  public.get_my_role() = 'admin'
);

-- ---------------------------------------------------------
-- RLS für Lernreisen
-- ---------------------------------------------------------
alter table learning_journeys enable row level security;
alter table journey_steps enable row level security;
alter table journey_tasks enable row level security;
alter table student_task_progress enable row level security;

drop policy if exists "journeys_select_authenticated" on learning_journeys;
drop policy if exists "journeys_write_tutor_admin" on learning_journeys;

create policy "journeys_select_authenticated"
on learning_journeys for select
using (
  auth.role() = 'authenticated'
  and (is_published = true or public.get_my_role() in ('tutor','admin'))
);

create policy "journeys_write_tutor_admin"
on learning_journeys for all
using (public.get_my_role() in ('tutor','admin'))
with check (public.get_my_role() in ('tutor','admin'));

drop policy if exists "steps_select_authenticated" on journey_steps;
drop policy if exists "steps_write_tutor_admin" on journey_steps;

create policy "steps_select_authenticated"
on journey_steps for select
using (auth.role() = 'authenticated');

create policy "steps_write_tutor_admin"
on journey_steps for all
using (public.get_my_role() in ('tutor','admin'))
with check (public.get_my_role() in ('tutor','admin'));

drop policy if exists "tasks_select_authenticated" on journey_tasks;
drop policy if exists "tasks_write_tutor_admin" on journey_tasks;

create policy "tasks_select_authenticated"
on journey_tasks for select
using (auth.role() = 'authenticated');

create policy "tasks_write_tutor_admin"
on journey_tasks for all
using (public.get_my_role() in ('tutor','admin'))
with check (public.get_my_role() in ('tutor','admin'));

-- ---------------------------------------------------------
-- Fortschritt: Lernende sehen nur eigenen Fortschritt,
-- Tutor/Admin können alle Fortschritte sehen.
-- ---------------------------------------------------------
drop policy if exists "progress_select_own_or_tutor_admin" on student_task_progress;
drop policy if exists "progress_insert_own_or_tutor_admin" on student_task_progress;
drop policy if exists "progress_update_own_or_tutor_admin" on student_task_progress;

create policy "progress_select_own_or_tutor_admin"
on student_task_progress for select
using (
  student_id = auth.uid()
  or public.get_my_role() in ('tutor','admin')
);

create policy "progress_insert_own_or_tutor_admin"
on student_task_progress for insert
with check (
  student_id = auth.uid()
  or public.get_my_role() in ('tutor','admin')
);

create policy "progress_update_own_or_tutor_admin"
on student_task_progress for update
using (
  student_id = auth.uid()
  or public.get_my_role() in ('tutor','admin')
)
with check (
  student_id = auth.uid()
  or public.get_my_role() in ('tutor','admin')
);

-- ---------------------------------------------------------
-- Nach erstem Login:
-- Ersetze die E-Mail und führe den Befehl aus,
-- um dich selbst zum Admin zu machen.
-- ---------------------------------------------------------
-- update profiles
-- set role = 'admin', display_name = 'Ralf Loskill'
-- where email = 'DEINE_EMAIL_ADRESSE';
