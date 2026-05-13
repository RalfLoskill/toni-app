-- TONI V29 – Vorname und Nachname im eigenen Profil ändern
-- Bitte komplett in Supabase SQL Editor ausführen.

create or replace function public.update_my_profile_names(
  p_first_name text,
  p_last_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text;
  v_last text;
  v_display text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_first := trim(coalesce(p_first_name, ''));
  v_last := trim(coalesce(p_last_name, ''));

  if length(v_first) < 1 then
    raise exception 'first_name_required';
  end if;

  if length(v_last) < 1 then
    raise exception 'last_name_required';
  end if;

  v_display := trim(v_first || ' ' || v_last);

  update public.profiles
  set first_name = v_first,
      last_name = v_last,
      display_name = v_display,
      updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'profile_not_found';
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', auth.uid(),
    'first_name', v_first,
    'last_name', v_last,
    'display_name', v_display
  );
end;
$$;

grant execute on function public.update_my_profile_names(text,text) to authenticated;
