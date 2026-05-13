-- =========================================================
-- TONI – V20 / QR-Code-Zuordnung für Lernreisen
-- Bitte komplett in Supabase SQL Editor ausführen.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.learning_journey_assignments (
  id uuid primary key default gen_random_uuid(),
  learning_journey_template_id uuid not null references public.learning_journey_templates(id) on delete cascade,
  student_profile_id uuid references public.profiles(id) on delete set null,
  student_email text not null,
  student_first_name text default '',
  student_last_name text default '',
  student_display_name text default '',
  student_class_name text default '',
  assigned_by_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'assigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learning_journey_template_id, student_email)
);

alter table public.learning_journey_assignments enable row level security;

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

drop policy if exists "learning_journeys_select_assigned_students" on public.learning_journey_templates;
create policy "learning_journeys_select_assigned_students"
on public.learning_journey_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.learning_journey_assignments a
    where a.learning_journey_template_id = learning_journey_templates.id
      and (
        a.student_profile_id = auth.uid()
        or lower(a.student_email) = lower((select email from public.profiles where id = auth.uid()))
      )
  )
);

drop policy if exists "learning_journeys_select_owner_or_admin" on public.learning_journey_templates;
create policy "learning_journeys_select_owner_or_admin"
on public.learning_journey_templates
for select
to authenticated
using (
  owner_profile_id = auth.uid()
  or public.get_my_role() = 'admin'
);

drop policy if exists "journey_assignments_select_relevant" on public.learning_journey_assignments;
create policy "journey_assignments_select_relevant"
on public.learning_journey_assignments
for select
to authenticated
using (
  public.get_my_role() = 'admin'
  or student_profile_id = auth.uid()
  or lower(student_email) = lower((select email from public.profiles where id = auth.uid()))
  or exists (
    select 1
    from public.learning_journey_templates t
    where t.id = learning_journey_template_id
      and t.owner_profile_id = auth.uid()
  )
);

drop policy if exists "journey_assignments_insert_admin_tutor_or_self" on public.learning_journey_assignments;
create policy "journey_assignments_insert_admin_tutor_or_self"
on public.learning_journey_assignments
for insert
to authenticated
with check (
  public.get_my_role() in ('admin','tutor')
  or student_profile_id = auth.uid()
  or lower(student_email) = lower((select email from public.profiles where id = auth.uid()))
);

drop policy if exists "journey_assignments_delete_admin_tutor" on public.learning_journey_assignments;
create policy "journey_assignments_delete_admin_tutor"
on public.learning_journey_assignments
for delete
to authenticated
using (
  public.get_my_role() in ('admin','tutor')
);

drop policy if exists "journey_assignments_update_admin_tutor_or_self" on public.learning_journey_assignments;
create policy "journey_assignments_update_admin_tutor_or_self"
on public.learning_journey_assignments
for update
to authenticated
using (
  public.get_my_role() in ('admin','tutor')
  or student_profile_id = auth.uid()
  or lower(student_email) = lower((select email from public.profiles where id = auth.uid()))
)
with check (
  public.get_my_role() in ('admin','tutor')
  or student_profile_id = auth.uid()
  or lower(student_email) = lower((select email from public.profiles where id = auth.uid()))
);

create index if not exists idx_learning_journey_assignments_template
on public.learning_journey_assignments(learning_journey_template_id);

create index if not exists idx_learning_journey_assignments_student_profile
on public.learning_journey_assignments(student_profile_id);

create index if not exists idx_learning_journey_assignments_student_email
on public.learning_journey_assignments(lower(student_email));
