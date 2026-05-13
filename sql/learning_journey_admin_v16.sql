-- =========================================================
-- TONI – V16 / Admin-Tutor Lernreisen verwalten
-- Bitte komplett in Supabase SQL Editor ausführen.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.learning_journey_templates (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subject text default '',
  goal text default '',
  description text default '',
  visibility text not null default 'private',
  journey_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_journey_templates enable row level security;

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

-- Admin sieht alle Lernreisen, Tutor sieht eigene Lernreisen.
drop policy if exists "learning_journeys_select_owner_or_admin" on public.learning_journey_templates;
create policy "learning_journeys_select_owner_or_admin"
on public.learning_journey_templates
for select
to authenticated
using (
  owner_profile_id = auth.uid()
  or public.get_my_role() = 'admin'
);

-- Admin/Tutor darf eigene Lernreisen anlegen.
drop policy if exists "learning_journeys_insert_tutor_admin" on public.learning_journey_templates;
create policy "learning_journeys_insert_tutor_admin"
on public.learning_journey_templates
for insert
to authenticated
with check (
  owner_profile_id = auth.uid()
  and public.get_my_role() in ('admin','tutor')
);

-- Admin darf alle bearbeiten, Tutor eigene.
drop policy if exists "learning_journeys_update_owner_or_admin" on public.learning_journey_templates;
create policy "learning_journeys_update_owner_or_admin"
on public.learning_journey_templates
for update
to authenticated
using (
  owner_profile_id = auth.uid()
  or public.get_my_role() = 'admin'
)
with check (
  owner_profile_id = auth.uid()
  or public.get_my_role() = 'admin'
);

-- Admin darf alle löschen, Tutor eigene.
drop policy if exists "learning_journeys_delete_owner_or_admin" on public.learning_journey_templates;
create policy "learning_journeys_delete_owner_or_admin"
on public.learning_journey_templates
for delete
to authenticated
using (
  owner_profile_id = auth.uid()
  or public.get_my_role() = 'admin'
);

create index if not exists idx_learning_journey_templates_owner
on public.learning_journey_templates(owner_profile_id);

create index if not exists idx_learning_journey_templates_updated
on public.learning_journey_templates(updated_at desc);
