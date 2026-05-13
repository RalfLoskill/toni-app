-- =========================================================
-- TONI – Auth V6 / Startpasswort + Passwort-Reset
-- Magic Link nur noch zum Zurücksetzen
-- =========================================================

alter table profiles
add column if not exists password_set boolean not null default false;

alter table profiles
add column if not exists force_password_change boolean not null default false;

create table if not exists admin_emails (
  email text primary key
);

insert into admin_emails (email)
values ('ralf.loskill@googlemail.com')
on conflict (email) do nothing;

-- Neue Auth-Nutzer starten normalerweise als student.
-- Admin-E-Mails werden automatisch admin.
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
    password_set,
    force_password_change
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    '',
    v_role,
    false,
    true
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

-- Markiert das Passwort als gesetzt und hebt den Zwang zum Passwortwechsel auf.
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
      force_password_change = false,
      updated_at = now()
  where id = auth.uid();

  return jsonb_build_object(
    'ok', true,
    'profile_id', auth.uid()
  );
end;
$$;

grant execute on function public.mark_my_password_set() to authenticated;

-- Bestandsprüfung bleibt erhalten, gibt aber keine sensiblen Details zurück.
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
