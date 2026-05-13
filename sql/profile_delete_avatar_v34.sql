-- TONI V34 – Eigenes Profilbild löschen
-- Bitte komplett in Supabase SQL Editor ausführen.

create or replace function public.delete_my_profile_avatar()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set avatar_data_url = null,
      updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'profile_not_found';
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', auth.uid(),
    'avatar_data_url', null
  );
end;
$$;

grant execute on function public.delete_my_profile_avatar() to authenticated;
