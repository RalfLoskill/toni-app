-- TONI V44 – RPC-Schema-Cache-Fix für neue Lernreisen
-- Behebt:
-- Could not find the function public.upsert_learning_journey_template_v43(...)
--
-- Bitte komplett in Supabase SQL Editor ausführen.

create extension if not exists pgcrypto;

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

-- Stabilere Funktion mit nur EINEM JSONB-Parameter.
-- Dadurch gibt es keine Probleme mit Parameterreihenfolge oder Typauflösung im PostgREST-Schema-Cache.
create or replace function public.upsert_learning_journey_template_v44(
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_id uuid;
  v_existing_owner uuid;
  v_result_id uuid;
  v_title text;
  v_subject text;
  v_goal text;
  v_description text;
  v_journey_json jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_role := public.get_my_role();

  if v_role not in ('admin','tutor') then
    raise exception 'not_allowed';
  end if;

  v_id := nullif(p_payload->>'id', '')::uuid;
  v_title := trim(coalesce(p_payload->>'title', ''));
  v_subject := coalesce(p_payload->>'subject', '');
  v_goal := coalesce(p_payload->>'goal', '');
  v_description := coalesce(p_payload->>'description', '');
  v_journey_json := coalesce(p_payload->'journey_json', '{}'::jsonb);

  if v_title = '' then
    raise exception 'title_required';
  end if;

  if v_id is not null then
    select owner_profile_id
    into v_existing_owner
    from public.learning_journey_templates
    where id = v_id
    limit 1;
  end if;

  if v_existing_owner is null then
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
      coalesce(v_id, gen_random_uuid()),
      auth.uid(),
      v_title,
      v_subject,
      v_goal,
      v_description,
      v_journey_json,
      now()
    )
    returning id into v_result_id;
  else
    if v_role <> 'admin' and v_existing_owner <> auth.uid() then
      raise exception 'not_owner';
    end if;

    update public.learning_journey_templates
    set title = v_title,
        subject = v_subject,
        goal = v_goal,
        description = v_description,
        journey_json = v_journey_json,
        updated_at = now()
    where id = v_id
    returning id into v_result_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_result_id
  );
end;
$$;

grant execute on function public.upsert_learning_journey_template_v44(jsonb) to authenticated;

-- Direkte Insert-Policy zusätzlich robust erneuern.
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

-- PostgREST/Supabase Schema-Cache aktiv neu laden.
notify pgrst, 'reload schema';
