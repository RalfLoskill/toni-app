-- =========================================================
-- TONI – Auth V5 / Passwort nach Magic Link erforderlich
-- =========================================================

-- ---------------------------------------------------------
-- 1. profiles um password_set erweitern
-- ---------------------------------------------------------
alter table profiles
add column if not exists password_set boolean not null default false;

-- ---------------------------------------------------------
-- 2. Admin-E-Mails
-- ---------------------------------------------------------
create table if not exists admin_emails (
  email text primary key
);

insert into admin_emails (email)
values ('ralf.loskill@googlemail.com')
on conflict (email) do nothing;

-- ---------------------------------------------------------
-- 3. handle_new_user aktualisieren
--    Neue Nutzer werden nach Magic Link angelegt,
--    password_set bleibt zunächst false.
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'student';
begin
  if exists (
    select 1
    from public.admin_emails
    where lower(email) = lower(new.email)
  ) then
    v_role := 'admin';
  end if;

  insert into public.profiles (
    id,
    display_name,
    email,
    class_name,
    role,
    password_set
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    '',
    v_role,
    false
  )
  on conflict (id) do update
  set email = excluded.email,
      role = case
        when exists (
          select 1
          from public.admin_emails
          where lower(email) = lower(new.email)
        )
        then 'admin'
        else public.profiles.role
      end,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- 4. Öffentliche Vorprüfung
--    Gibt nur zurück:
--    - ob Profil existiert
--    - ob bereits ein Passwort gesetzt wurde
-- ---------------------------------------------------------
create or replace function public.check_profile_exists_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean := false;
  v_password_set boolean := false;
begin
  select exists (
    select 1
    from public.profiles
    where lower(email) = lower(trim(p_email))
      and is_active = true
  )
  into v_exists;

  if v_exists then
    select coalesce(password_set, false)
    into v_password_set
    from public.profiles
    where lower(email) = lower(trim(p_email))
      and is_active = true
    limit 1;
  end if;

  return jsonb_build_object(
    'exists', v_exists,
    'password_set', coalesce(v_password_set, false)
  );
end;
$$;

grant execute on function public.check_profile_exists_by_email(text) to anon;
grant execute on function public.check_profile_exists_by_email(text) to authenticated;

-- ---------------------------------------------------------
-- 5. Nach erfolgreichem supabase.auth.updateUser({password})
--    markiert die App das Profil als vollständig eingerichtet.
-- ---------------------------------------------------------
create or replace function public.mark_my_password_set()
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
  set password_set = true,
      updated_at = now()
  where id = auth.uid();

  return jsonb_build_object(
    'ok', true,
    'profile_id', auth.uid()
  );
end;
$$;

grant execute on function public.mark_my_password_set() to authenticated;

-- ---------------------------------------------------------
-- 6. Optional: vorhandenen Admin sofort als vollständig markieren,
--    wenn du schon ein Passwort in Supabase gesetzt hast.
--    Sonst NICHT ausführen.
-- ---------------------------------------------------------
-- update profiles
-- set password_set = true
-- where email = 'ralf.loskill@googlemail.com';
