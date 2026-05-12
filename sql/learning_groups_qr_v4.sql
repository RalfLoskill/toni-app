-- =========================================================
-- TONI – Lerngruppen / QR-Beitritt V4
-- =========================================================
create extension if not exists "pgcrypto";

create table if not exists learning_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  tutor_id uuid not null references profiles(id) on delete cascade,
  join_code text not null unique,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists learning_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references learning_groups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role_in_group text not null default 'student',
  joined_at timestamptz default now(),
  unique(group_id, profile_id),
  constraint learning_group_members_role_check check (role_in_group in ('student','tutor'))
);

create index if not exists idx_learning_groups_tutor_id on learning_groups(tutor_id);
create index if not exists idx_learning_groups_join_code on learning_groups(join_code);
create index if not exists idx_learning_group_members_group_id on learning_group_members(group_id);
create index if not exists idx_learning_group_members_profile_id on learning_group_members(profile_id);

create or replace function join_learning_group_by_code(p_join_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group learning_groups;
  v_profile profiles;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into v_profile from profiles where id = auth.uid();
  if v_profile.id is null then raise exception 'profile_not_found'; end if;

  select * into v_group
  from learning_groups
  where join_code = p_join_code and is_active = true
  limit 1;

  if v_group.id is null then raise exception 'group_not_found'; end if;

  insert into learning_group_members (group_id, profile_id, role_in_group)
  values (v_group.id, auth.uid(), 'student')
  on conflict (group_id, profile_id) do nothing;

  return jsonb_build_object(
    'group_id', v_group.id,
    'group_name', v_group.name,
    'profile_id', auth.uid(),
    'profile_name', v_profile.display_name
  );
end;
$$;

grant execute on function join_learning_group_by_code(text) to authenticated;

alter table learning_groups enable row level security;
alter table learning_group_members enable row level security;

drop policy if exists "groups_select_related" on learning_groups;
drop policy if exists "groups_insert_tutor_admin" on learning_groups;
drop policy if exists "groups_update_owner_admin" on learning_groups;
drop policy if exists "groups_delete_owner_admin" on learning_groups;

create policy "groups_select_related"
on learning_groups for select
using (
  public.get_my_role() in ('tutor','admin')
  or exists (
    select 1 from learning_group_members m
    where m.group_id = learning_groups.id and m.profile_id = auth.uid()
  )
);

create policy "groups_insert_tutor_admin"
on learning_groups for insert
with check (public.get_my_role() in ('tutor','admin') and tutor_id = auth.uid());

create policy "groups_update_owner_admin"
on learning_groups for update
using (public.get_my_role() = 'admin' or tutor_id = auth.uid())
with check (public.get_my_role() = 'admin' or tutor_id = auth.uid());

create policy "groups_delete_owner_admin"
on learning_groups for delete
using (public.get_my_role() = 'admin' or tutor_id = auth.uid());

drop policy if exists "members_select_related" on learning_group_members;
drop policy if exists "members_insert_self_or_tutor_admin" on learning_group_members;
drop policy if exists "members_update_tutor_admin" on learning_group_members;
drop policy if exists "members_delete_tutor_admin" on learning_group_members;

create policy "members_select_related"
on learning_group_members for select
using (
  profile_id = auth.uid()
  or public.get_my_role() in ('tutor','admin')
  or exists (select 1 from learning_groups g where g.id = learning_group_members.group_id and g.tutor_id = auth.uid())
);

create policy "members_insert_self_or_tutor_admin"
on learning_group_members for insert
with check (profile_id = auth.uid() or public.get_my_role() in ('tutor','admin'));

create policy "members_update_tutor_admin"
on learning_group_members for update
using (public.get_my_role() in ('tutor','admin'))
with check (public.get_my_role() in ('tutor','admin'));

create policy "members_delete_tutor_admin"
on learning_group_members for delete
using (public.get_my_role() in ('tutor','admin'));
