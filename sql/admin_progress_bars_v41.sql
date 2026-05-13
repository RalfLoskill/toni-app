-- TONI V41 – Fortschrittsbalken für Admin je Student/Lernreise
-- Bitte komplett in Supabase SQL Editor ausführen.
-- Voraussetzung: V40 learning_journey_progress ist angelegt.

create or replace function public.get_learning_journey_assignments_with_profiles_and_progress()
returns table (
  id uuid,
  learning_journey_template_id uuid,
  student_profile_id uuid,
  student_email text,
  student_first_name text,
  student_last_name text,
  student_display_name text,
  student_class_name text,
  student_avatar_data_url text,
  profile_email text,
  profile_first_name text,
  profile_last_name text,
  profile_display_name text,
  profile_class_name text,
  assigned_by_profile_id uuid,
  assignment_status text,
  progress_percent integer,
  progress_status text,
  progress_updated_at timestamptz,
  progress_last_opened_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id,
    a.learning_journey_template_id,
    coalesce(a.student_profile_id, p.id) as student_profile_id,
    a.student_email,
    coalesce(nullif(a.student_first_name, ''), p.first_name, '') as student_first_name,
    coalesce(nullif(a.student_last_name, ''), p.last_name, '') as student_last_name,
    coalesce(nullif(a.student_display_name, ''), p.display_name, a.student_email) as student_display_name,
    coalesce(nullif(a.student_class_name, ''), p.class_name, '') as student_class_name,
    p.avatar_data_url as student_avatar_data_url,
    p.email as profile_email,
    p.first_name as profile_first_name,
    p.last_name as profile_last_name,
    p.display_name as profile_display_name,
    p.class_name as profile_class_name,
    a.assigned_by_profile_id,
    a.status as assignment_status,
    coalesce(pr.progress_percent, 0) as progress_percent,
    coalesce(pr.status, 'not_started') as progress_status,
    pr.updated_at as progress_updated_at,
    pr.last_opened_at as progress_last_opened_at,
    a.created_at,
    a.updated_at
  from public.learning_journey_assignments a
  join public.learning_journey_templates t
    on t.id = a.learning_journey_template_id
  left join public.profiles p
    on p.id = a.student_profile_id
    or lower(p.email) = lower(a.student_email)
  left join public.learning_journey_progress pr
    on pr.learning_journey_template_id = a.learning_journey_template_id
    and pr.student_profile_id = p.id
  where
    public.get_my_role() = 'admin'
    or t.owner_profile_id = auth.uid()
  order by a.created_at desc;
$$;

grant execute on function public.get_learning_journey_assignments_with_profiles_and_progress() to authenticated;
