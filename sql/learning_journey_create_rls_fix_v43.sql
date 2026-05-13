-- TONI V43 – Neue Lernreisen sicher anlegen/ändern
-- Behebt:
-- new row violates row-level security policy for table "learning_journey_templates"
--
-- Bitte komplett in Supabase SQL Editor ausführen.

create extension if not exists pgcrypto;

-- Hilfsfunktion ggf. erneuern
create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

-- Sichere RPC-Funktion zum Anlegen/Aktualisieren einer Lernreise.
-- Dadurch muss der Browser keinen direkten INSERT in learning_journey_templates ausführen.
create or replace function public.upsert_learning_journey_template_v43(
  p_id uuid,
  p_title text,
  p_subject text default '',
  p_goal text default '',
  p_description text default '',
  p_journey_json jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_existing_owner uuid;
  v_result_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_role := public.get_my_role();

  if v_role not in ('admin','tutor') then
    raise exception 'not_allowed';
  end if;

  if trim(coalesce(p_title, '')) = '' then
    raise exception 'title_required';
  end if;

  -- Prüfen, ob die Lernreise bereits existiert.
  select owner_profile_id
  into v_existing_owner
  from public.learning_journey_templates
  where id = p_id
  limit 1;

  if v_existing_owner is null then
    -- Neue Lernreise:
    -- owner_profile_id wird immer auf auth.uid() gesetzt.
    -- Damit ist die Zuordnung sauber und unabhängig von lokalen/alten Profilwerten im Browser.
    insert into public.learning_journey_templates (
      id,
      owner_profile_id,
      title,
      subject,
      goal,
      description,
      journey_json,
      updated_at
    )
    values (
      coalesce(p_id, gen_random_uuid()),
      auth.uid(),
      trim(p_title),
      coalesce(p_subject, ''),
      coalesce(p_goal, ''),
      coalesce(p_description, ''),
      coalesce(p_journey_json, '{}'::jsonb),
      now()
    )
    returning id into v_result_id;
  else
    -- Bestehende Lernreise:
    -- Admin darf alle ändern, Tutor nur eigene.
    if v_role <> 'admin' and v_existing_owner <> auth.uid() then
      raise exception 'not_owner';
    end if;

    update public.learning_journey_templates
    set title = trim(p_title),
        subject = coalesce(p_subject, ''),
        goal = coalesce(p_goal, ''),
        description = coalesce(p_description, ''),
        journey_json = coalesce(p_journey_json, '{}'::jsonb),
        updated_at = now()
    where id = p_id
    returning id into v_result_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_result_id
  );
end;
$$;

grant execute on function public.upsert_learning_journey_template_v43(
  uuid,text,text,text,text,jsonb
) to authenticated;

-- Zusätzlich die direkte Insert-Policy robuster setzen.
-- Dadurch funktionieren auch ältere Browserstände weiter.
drop policy if exists "learning_journeys_insert_tutor_admin" on public.learning_journey_templates;
create policy "learning_journeys_insert_tutor_admin"
on public.learning_journey_templates
for insert
to authenticated
with check (
  public.get_my_role() in ('admin','tutor')
  and (
    owner_profile_id = auth.uid()
    or public.get_my_role() = 'admin'
  )
);

-- Update-Policy beibehalten/erneuern.
drop policy if exists "learning_journeys_update_owner_or_admin" on public.learning_journey_templates;
create policy "learning_journeys_update_owner_or_admin"
on public.learning_journey_templates
for update
to authenticated
using (
  owner_profile_id = auth.uid()
  or public.get_my_role() = 'admin'
)
with check (
  owner_profile_id = auth.uid()
  or public.get_my_role() = 'admin'
);
