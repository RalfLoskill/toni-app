-- TONI V21 – RLS-Rekursion bei Lernreisen beheben
-- Fehler: infinite recursion detected in policy for relation "learning_journey_templates"
-- Bitte komplett in Supabase SQL Editor ausführen.

create extension if not exists pgcrypto;

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

create or replace function public.get_my_email()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

-- SECURITY DEFINER-Funktionen vermeiden die RLS-Endlosschleife.
create or replace function public.can_access_learning_journey_template(p_template_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.learning_journey_templates t
    where t.id = p_template_id
      and (
        t.owner_profile_id = auth.uid()
        or public.get_my_role() = 'admin'
        or exists (
          select 1
          from public.learning_journey_assignments a
          where a.learning_journey_template_id = t.id
            and (
              a.student_profile_id = auth.uid()
              or lower(a.student_email) = lower(public.get_my_email())
            )
        )
      )
  );
$$;

create or replace function public.can_access_learning_journey_assignment(p_assignment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.learning_journey_assignments a
    left join public.learning_journey_templates t
      on t.id = a.learning_journey_template_id
    where a.id = p_assignment_id
      and (
        public.get_my_role() = 'admin'
        or t.owner_profile_id = auth.uid()
        or a.student_profile_id = auth.uid()
        or lower(a.student_email) = lower(public.get_my_email())
      )
  );
$$;

-- Rekursive SELECT-Policies entfernen
drop policy if exists "learning_journeys_select_assigned_students" on public.learning_journey_templates;
drop policy if exists "learning_journeys_select_owner_or_admin" on public.learning_journey_templates;
drop policy if exists "learning_journeys_select_owner_or_admin_or_assigned" on public.learning_journey_templates;
drop policy if exists "learning_journeys_select_v21" on public.learning_journey_templates;

drop policy if exists "journey_assignments_select_relevant" on public.learning_journey_assignments;
drop policy if exists "journey_assignments_select_owner_admin_student" on public.learning_journey_assignments;
drop policy if exists "journey_assignments_select_v21" on public.learning_journey_assignments;

-- Neue SELECT-Policies ohne direkte gegenseitige Tabellenverweise
create policy "learning_journeys_select_v21"
on public.learning_journey_templates
for select
to authenticated
using (public.can_access_learning_journey_template(id));

create policy "journey_assignments_select_v21"
on public.learning_journey_assignments
for select
to authenticated
using (public.can_access_learning_journey_assignment(id));

-- Templates: Insert / Update / Delete
drop policy if exists "learning_journeys_insert_tutor_admin" on public.learning_journey_templates;
create policy "learning_journeys_insert_tutor_admin"
on public.learning_journey_templates
for insert
to authenticated
with check (
  owner_profile_id = auth.uid()
  and public.get_my_role() in ('admin','tutor')
);

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

drop policy if exists "learning_journeys_delete_owner_or_admin" on public.learning_journey_templates;
create policy "learning_journeys_delete_owner_or_admin"
on public.learning_journey_templates
for delete
to authenticated
using (
  owner_profile_id = auth.uid()
  or public.get_my_role() = 'admin'
);

-- Zuordnungen: Insert / Update / Delete
drop policy if exists "journey_assignments_insert_admin_tutor" on public.learning_journey_assignments;
drop policy if exists "journey_assignments_insert_admin_tutor_or_self" on public.learning_journey_assignments;
create policy "journey_assignments_insert_admin_tutor_or_self"
on public.learning_journey_assignments
for insert
to authenticated
with check (
  public.get_my_role() in ('admin','tutor')
  or student_profile_id = auth.uid()
  or lower(student_email) = lower(public.get_my_email())
);

drop policy if exists "journey_assignments_update_admin_tutor" on public.learning_journey_assignments;
drop policy if exists "journey_assignments_update_admin_tutor_or_self" on public.learning_journey_assignments;
create policy "journey_assignments_update_admin_tutor_or_self"
on public.learning_journey_assignments
for update
to authenticated
using (
  public.get_my_role() in ('admin','tutor')
  or student_profile_id = auth.uid()
  or lower(student_email) = lower(public.get_my_email())
)
with check (
  public.get_my_role() in ('admin','tutor')
  or student_profile_id = auth.uid()
  or lower(student_email) = lower(public.get_my_email())
);

drop policy if exists "journey_assignments_delete_admin_tutor" on public.learning_journey_assignments;
create policy "journey_assignments_delete_admin_tutor"
on public.learning_journey_assignments
for delete
to authenticated
using (public.get_my_role() in ('admin','tutor'));

create index if not exists idx_learning_journey_templates_owner
on public.learning_journey_templates(owner_profile_id);

create index if not exists idx_learning_journey_templates_updated
on public.learning_journey_templates(updated_at desc);

create index if not exists idx_learning_journey_assignments_template
on public.learning_journey_assignments(learning_journey_template_id);

create index if not exists idx_learning_journey_assignments_student_profile
on public.learning_journey_assignments(student_profile_id);

create index if not exists idx_learning_journey_assignments_student_email
on public.learning_journey_assignments(lower(student_email));
