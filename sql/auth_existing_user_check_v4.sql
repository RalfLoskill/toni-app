-- =========================================================
-- TONI – Auth V4 / Bestandsnutzer-Prüfung
-- Magic Link nur bei Erstanmeldung, Bestandsnutzer per Passwort
-- =========================================================

-- ---------------------------------------------------------
-- 1. Admin-E-Mails, damit bestimmte E-Mails automatisch Admin werden
-- ---------------------------------------------------------
create table if not exists admin_emails (
  email text primary key
);

insert into admin_emails (email)
values ('ralf.loskill@googlemail.com')
on conflict (email) do nothing;

-- ---------------------------------------------------------
-- 2. handle_new_user aktualisieren:
--    Neue Nutzer erhalten automatisch student/admin je nach E-Mail.
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
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    '',
    v_role
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
-- 3. Öffentliche Vorprüfung:
--    Gibt nur zurück, ob es bereits ein Profil gibt.
--    Keine Rolle, keine Namen, keine sensiblen Details.
-- ---------------------------------------------------------
create or replace function public.check_profile_exists_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean := false;
begin
  select exists (
    select 1
    from public.profiles
    where lower(email) = lower(trim(p_email))
      and is_active = true
  )
  into v_exists;

  return jsonb_build_object(
    'exists', v_exists
  );
end;
$$;

grant execute on function public.check_profile_exists_by_email(text) to anon;
grant execute on function public.check_profile_exists_by_email(text) to authenticated;

-- ---------------------------------------------------------
-- Hinweis:
-- Bestandsnutzer benötigen ein Passwort, wenn Magic Link nur
-- für die Erstanmeldung genutzt werden soll.
-- In Supabase kann ein Nutzer nach Login ein Passwort setzen:
-- supabase.auth.updateUser({ password: '...' })
-- ---------------------------------------------------------
