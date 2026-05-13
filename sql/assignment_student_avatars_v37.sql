-- TONI V37 – Profilbilder in der Zuordnungstabelle zuverlässig laden
-- Bitte komplett in Supabase SQL Editor ausführen.

create or replace function public.get_learning_journey_assignments_with_profiles()
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
  status text,
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
    a.student_profile_id,
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
    a.status,
    a.created_at,
    a.updated_at
  from public.learning_journey_assignments a
  join public.learning_journey_templates t
    on t.id = a.learning_journey_template_id
  left join public.profiles p
    on p.id = a.student_profile_id
    or lower(p.email) = lower(a.student_email)
  where
    public.get_my_role() = 'admin'
    or t.owner_profile_id = auth.uid()
  order by a.created_at desc;
$$;

grant execute on function public.get_learning_journey_assignments_with_profiles() to authenticated;
