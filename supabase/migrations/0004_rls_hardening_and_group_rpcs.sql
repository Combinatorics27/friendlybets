create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  );
$$;

create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_invite_code text;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Group name is required';
  end if;

  loop
    v_invite_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (
      select 1 from public.groups g where g.invite_code = v_invite_code
    );
  end loop;

  insert into public.groups (name, invite_code, created_by)
  values (trim(p_name), v_invite_code, v_user_id)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'owner')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

create or replace function public.join_group_by_code(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select g.id
  into v_group_id
  from public.groups g
  where g.invite_code = upper(trim(coalesce(p_invite_code, '')));

  if v_group_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

drop policy if exists "group_members_insert_self" on public.group_members;
create policy "group_members_insert_none"
on public.group_members for insert
to authenticated
with check (false);

grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
