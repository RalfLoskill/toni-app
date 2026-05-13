-- TONI V40 – Individuellen Lernstand je Student und Lernreise speichern
-- Bitte komplett in Supabase SQL Editor ausführen.

create extension if not exists pgcrypto;

create table if not exists public.learning_journey_progress (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  learning_journey_template_id uuid not null references public.learning_journey_templates(id) on delete cascade,
  progress_json jsonb not null default '{}'::jsonb,
  active_step_id text,
  active_step_index integer not null default 0,
  selected_task_id text,
  progress_percent integer not null default 0,
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_profile_id, learning_journey_template_id)
);

alter table public.learning_journey_progress enable row level security;

create index if not exists idx_learning_journey_progress_student
on public.learning_journey_progress(student_profile_id);

create index if not exists idx_learning_journey_progress_template
on public.learning_journey_progress(learning_journey_template_id);

create index if not exists idx_learning_journey_progress_updated
on public.learning_journey_progress(updated_at desc);

-- Student sieht und bearbeitet nur eigenen Lernstand.
drop policy if exists "learning_journey_progress_select_own" on public.learning_journey_progress;
create policy "learning_journey_progress_select_own"
on public.learning_journey_progress
for select
to authenticated
using (
  student_profile_id = auth.uid()
  or public.get_my_role() in ('admin','tutor')
);

drop policy if exists "learning_journey_progress_insert_own" on public.learning_journey_progress;
create policy "learning_journey_progress_insert_own"
on public.learning_journey_progress
for insert
to authenticated
with check (
  student_profile_id = auth.uid()
);

drop policy if exists "learning_journey_progress_update_own" on public.learning_journey_progress;
create policy "learning_journey_progress_update_own"
on public.learning_journey_progress
for update
to authenticated
using (
  student_profile_id = auth.uid()
)
with check (
  student_profile_id = auth.uid()
);

-- Lernstand speichern.
create or replace function public.save_my_learning_journey_progress(
  p_template_id uuid,
  p_progress_json jsonb,
  p_active_step_id text default null,
  p_active_step_index integer default 0,
  p_selected_task_id text default null,
  p_progress_percent integer default 0,
  p_status text default 'in_progress'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_assignment_exists boolean;
  v_completed_at timestamptz;
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

  select exists (
    select 1
    from public.learning_journey_assignments a
    where a.learning_journey_template_id = p_template_id
      and (
        a.student_profile_id = v_profile.id
        or lower(a.student_email) = lower(v_profile.email)
      )
  )
  into v_assignment_exists;

  if not v_assignment_exists then
    raise exception 'learning_journey_not_assigned';
  end if;

  v_completed_at := case
    when coalesce(p_status, 'in_progress') = 'completed'
      or coalesce(p_progress_percent, 0) >= 100
    then now()
    else null
  end;

  insert into public.learning_journey_progress (
    student_profile_id,
    learning_journey_template_id,
    progress_json,
    active_step_id,
    active_step_index,
    selected_task_id,
    progress_percent,
    status,
    completed_at,
    last_opened_at,
    updated_at
  )
  values (
    v_profile.id,
    p_template_id,
    coalesce(p_progress_json, '{}'::jsonb),
    p_active_step_id,
    coalesce(p_active_step_index, 0),
    p_selected_task_id,
    greatest(0, least(100, coalesce(p_progress_percent, 0))),
    coalesce(p_status, 'in_progress'),
    v_completed_at,
    now(),
    now()
  )
  on conflict (student_profile_id, learning_journey_template_id)
  do update set
    progress_json = excluded.progress_json,
    active_step_id = excluded.active_step_id,
    active_step_index = excluded.active_step_index,
    selected_task_id = excluded.selected_task_id,
    progress_percent = excluded.progress_percent,
    status = excluded.status,
    completed_at = case
      when excluded.status = 'completed' or excluded.progress_percent >= 100
      then coalesce(public.learning_journey_progress.completed_at, now())
      else null
    end,
    last_opened_at = now(),
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'student_profile_id', v_profile.id,
    'learning_journey_template_id', p_template_id,
    'progress_percent', greatest(0, least(100, coalesce(p_progress_percent, 0))),
    'status', coalesce(p_status, 'in_progress')
  );
end;
$$;

grant execute on function public.save_my_learning_journey_progress(uuid,jsonb,text,integer,text,integer,text) to authenticated;

-- Lernstand für eine Lernreise laden.
create or replace function public.get_my_learning_journey_progress(
  p_template_id uuid
)
returns table (
  id uuid,
  learning_journey_template_id uuid,
  progress_json jsonb,
  active_step_id text,
  active_step_index integer,
  selected_task_id text,
  progress_percent integer,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  last_opened_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.learning_journey_template_id,
    p.progress_json,
    p.active_step_id,
    p.active_step_index,
    p.selected_task_id,
    p.progress_percent,
    p.status,
    p.started_at,
    p.completed_at,
    p.last_opened_at,
    p.updated_at
  from public.learning_journey_progress p
  where p.student_profile_id = auth.uid()
    and p.learning_journey_template_id = p_template_id
  limit 1;
$$;

grant execute on function public.get_my_learning_journey_progress(uuid) to authenticated;

-- Alle Lernstände des angemeldeten Studenten laden, zuletzt bearbeitete zuerst.
create or replace function public.get_my_learning_journey_progress_all()
returns table (
  id uuid,
  learning_journey_template_id uuid,
  progress_json jsonb,
  active_step_id text,
  active_step_index integer,
  selected_task_id text,
  progress_percent integer,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  last_opened_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.learning_journey_template_id,
    p.progress_json,
    p.active_step_id,
    p.active_step_index,
    p.selected_task_id,
    p.progress_percent,
    p.status,
    p.started_at,
    p.completed_at,
    p.last_opened_at,
    p.updated_at
  from public.learning_journey_progress p
  where p.student_profile_id = auth.uid()
  order by p.updated_at desc;
$$;

grant execute on function public.get_my_learning_journey_progress_all() to authenticated;
