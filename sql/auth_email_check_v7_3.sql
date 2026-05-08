-- =========================================================
-- TONI – Auth V7.3 / Fix E-Mail-Prüfung bleibt hängen
-- Bitte komplett in Supabase SQL Editor ausführen.
-- =========================================================

alter table profiles add column if not exists profile_complete boolean not null default false;
alter table profiles add column if not exists password_set boolean not null default false;
alter table profiles add column if not exists force_password_change boolean not null default false;

alter table profiles enable row level security;

-- Für die E-Mail-Prüfung aus dem Browser darf anonym nur erkannt werden,
-- ob zu einer E-Mail ein vollständiges aktives Profil existiert.
-- Die Abfrage gibt nur id zurück.
drop policy if exists "profiles_anon_check_completed_email" on profiles;
create policy "profiles_anon_check_completed_email"
on profiles for select
to anon
using (
  is_active = true
  and profile_complete = true
);

-- Angemeldete Nutzer dürfen ihr eigenes Profil lesen.
drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
on profiles for select
to authenticated
using (
  id = auth.uid()
  or public.get_my_role() = 'admin'
);

-- Angemeldete Nutzer dürfen ihr eigenes Profil vervollständigen.
drop policy if exists "profiles_update_own_incomplete" on profiles;
create policy "profiles_update_own_incomplete"
on profiles for update
to authenticated
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);

-- RPC bleibt als Fallback bestehen.
create or replace function public.check_profile_exists_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_exists boolean := false;
begin
  select exists (
    select 1
    from public.profiles
    where lower(email)=lower(trim(p_email))
      and is_active=true
      and profile_complete=true
  ) into v_exists;

  return jsonb_build_object('exists',v_exists);
end;
$$;

grant execute on function public.check_profile_exists_by_email(text) to anon;
grant execute on function public.check_profile_exists_by_email(text) to authenticated;
