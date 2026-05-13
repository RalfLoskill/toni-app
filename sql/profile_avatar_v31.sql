-- TONI V31 – Profilbild im Profil speichern
-- Bitte komplett in Supabase SQL Editor ausführen.

alter table public.profiles
add column if not exists avatar_data_url text;

create or replace function public.update_my_profile_avatar(
  p_avatar_data_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avatar text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_avatar := coalesce(p_avatar_data_url, '');

  if v_avatar = '' then
    raise exception 'avatar_missing';
  end if;

  if position('data:image/' in v_avatar) <> 1 then
    raise exception 'invalid_avatar_format';
  end if;

  -- Sicherheitsgrenze: ca. 1,5 MB als Base64-Data-URL
  if length(v_avatar) > 1500000 then
    raise exception 'avatar_too_large';
  end if;

  update public.profiles
  set avatar_data_url = v_avatar,
      updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'profile_not_found';
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', auth.uid(),
    'avatar_data_url', v_avatar
  );
end;
$$;

grant execute on function public.update_my_profile_avatar(text) to authenticated;
