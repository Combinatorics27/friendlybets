drop policy if exists "group_members_select_member_only" on public.group_members;

create policy "group_members_select_member_only"
on public.group_members for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_group_admin(group_id)
);
