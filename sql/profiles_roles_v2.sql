-- =========================================================
-- TONI – Rollen V2 / Profile
-- Ergänzung für Supabase
-- =========================================================

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
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

insert into profiles (id, display_name, email, class_name, role)
values
('41111111-1111-1111-1111-111111111111','Max Mustermann','max.demo@toni.local','ET23A','student'),
('42222222-2222-2222-2222-222222222222','Frau Schneider','tutor.demo@toni.local','ET23A','tutor'),
('43333333-3333-3333-3333-333333333333','Admin TONI','admin.demo@toni.local',null,'admin')
on conflict (id) do update
set display_name=excluded.display_name,
    email=excluded.email,
    class_name=excluded.class_name,
    role=excluded.role,
    updated_at=now();

alter table profiles enable row level security;

drop policy if exists "demo_select_profiles" on profiles;
drop policy if exists "demo_insert_profiles" on profiles;
drop policy if exists "demo_update_profiles" on profiles;

create policy "demo_select_profiles" on profiles for select using (true);
create policy "demo_insert_profiles" on profiles for insert with check (true);
create policy "demo_update_profiles" on profiles for update using (true);
