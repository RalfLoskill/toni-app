-- TONI V23 – Student kann eigene Lernreise-Zuordnung löschen
-- Bitte komplett in Supabase SQL Editor ausführen.

create or replace function public.delete_my_learning_journey_assignment(p_template_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_deleted integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select id, email
  into v_profile
  from public.profiles
  where id = auth.uid()
  limit 1;

  if v_profile.id is null then
    raise exception 'profile_not_found';
  end if;

  delete from public.learning_journey_assignments
  where learning_journey_template_id = p_template_id
    and (
      student_profile_id = v_profile.id
      or lower(student_email) = lower(v_profile.email)
    );

  get diagnostics v_deleted = row_count;

  return jsonb_build_object(
    'ok', true,
    'deleted', v_deleted,
    'learning_journey_template_id', p_template_id
  );
end;
$$;

grant execute on function public.delete_my_learning_journey_assignment(uuid) to authenticated;
