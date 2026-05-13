-- =========================================================
-- TONI – V22 / Student kann Lernreise per QR-Code sicher zuordnen
-- Behebt:
-- new row violates row-level security policy for table "learning_journey_assignments"
-- Bitte komplett in Supabase SQL Editor ausführen.
-- =========================================================

create extension if not exists pgcrypto;

-- Hilfsfunktion: aktuelles Profil lesen
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

-- RPC: Student ordnet sich selbst einer Lernreise zu.
-- Diese Funktion läuft als SECURITY DEFINER und vermeidet RLS-Probleme beim direkten Insert.
create or replace function public.assign_learning_journey_to_me(p_template_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_template record;
  v_assignment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select
    id,
    email,
    display_name,
    first_name,
    last_name,
    class_name,
    role
  into v_profile
  from public.profiles
  where id = auth.uid()
  limit 1;

  if v_profile.id is null then
    raise exception 'profile_not_found';
  end if;

  if coalesce(v_profile.email, '') = '' then
    raise exception 'profile_email_missing';
  end if;

  select id, title
  into v_template
  from public.learning_journey_templates
  where id = p_template_id
  limit 1;

  if v_template.id is null then
    raise exception 'learning_journey_not_found';
  end if;

  insert into public.learning_journey_assignments (
    learning_journey_template_id,
    student_profile_id,
    student_email,
    student_first_name,
    student_last_name,
    student_display_name,
    student_class_name,
    assigned_by_profile_id,
    status,
    updated_at
  )
  values (
    p_template_id,
    v_profile.id,
    lower(v_profile.email),
    coalesce(v_profile.first_name, ''),
    coalesce(v_profile.last_name, ''),
    coalesce(nullif(v_profile.display_name, ''), v_profile.email),
    coalesce(v_profile.class_name, ''),
    null,
    'assigned',
    now()
  )
  on conflict (learning_journey_template_id, student_email)
  do update set
    student_profile_id = excluded.student_profile_id,
    student_first_name = excluded.student_first_name,
    student_last_name = excluded.student_last_name,
    student_display_name = excluded.student_display_name,
    student_class_name = excluded.student_class_name,
    status = 'assigned',
    updated_at = now()
  returning id into v_assignment_id;

  return jsonb_build_object(
    'ok', true,
    'assignment_id', v_assignment_id,
    'learning_journey_template_id', p_template_id,
    'title', v_template.title
  );
end;
$$;

grant execute on function public.assign_learning_journey_to_me(uuid) to authenticated;

-- RLS bleibt aktiv, aber der Student braucht für QR-Zuordnung keinen direkten INSERT mehr.
alter table public.learning_journey_assignments enable row level security;

-- Vorhandene direkte Insert-Policy großzügig genug halten, falls weiterhin ein direkter Insert genutzt wird.
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

-- Update-Policy ebenfalls absichern.
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
