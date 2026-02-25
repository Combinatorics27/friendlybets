drop policy if exists "groups_select_member_only" on public.groups;
create policy "groups_select_member_only"
on public.groups for select
to authenticated
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = auth.uid()
  )
  or created_by = auth.uid()
);

drop policy if exists "group_members_select_member_only" on public.group_members;
create policy "group_members_select_member_only"
on public.group_members for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
);
