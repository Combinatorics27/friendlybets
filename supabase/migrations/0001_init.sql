create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  balance numeric(12,2) not null default 1000,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  question text not null,
  option_a text not null,
  option_b text not null,
  closes_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'settled', 'cancelled')),
  winning_selection text,
  created_at timestamptz not null default now()
);

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  selection text not null,
  amount numeric(12,2) not null check (amount > 0),
  result text not null default 'pending' check (result in ('pending', 'won', 'lost', 'void')),
  payout numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (market_id, user_id)
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bet', 'payout', 'adjustment')),
  amount numeric(12,2) not null,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  );
$$;

create or replace function public.place_bet(
  p_market_id uuid,
  p_selection text,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_market record;
  v_balance numeric;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be > 0';
  end if;

  select m.*, e.group_id
  into v_market
  from public.markets m
  join public.events e on e.id = m.event_id
  where m.id = p_market_id;

  if not found then
    raise exception 'Market not found';
  end if;

  v_group_id := v_market.group_id;

  if not public.is_group_member(v_group_id) then
    raise exception 'Not a group member';
  end if;

  if v_market.status <> 'open' then
    raise exception 'Market is not open';
  end if;

  if v_market.closes_at <= now() then
    raise exception 'Market already closed';
  end if;

  if p_selection not in (v_market.option_a, v_market.option_b) then
    raise exception 'Invalid selection';
  end if;

  select balance
  into v_balance
  from public.group_members
  where group_id = v_group_id and user_id = v_user_id
  for update;

  if v_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  insert into public.bets (group_id, market_id, user_id, selection, amount)
  values (v_group_id, p_market_id, v_user_id, p_selection, p_amount);

  update public.group_members
  set balance = balance - p_amount
  where group_id = v_group_id and user_id = v_user_id;

  insert into public.ledger_entries (group_id, user_id, kind, amount, reference_id, note)
  values (v_group_id, v_user_id, 'bet', p_amount, p_market_id, 'Bet placed');
end;
$$;

create or replace function public.settle_market(
  p_market_id uuid,
  p_winning_selection text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_total_pool numeric := 0;
  v_winning_pool numeric := 0;
  v_row record;
  v_payout numeric := 0;
begin
  select e.group_id
  into v_group_id
  from public.markets m
  join public.events e on e.id = m.event_id
  where m.id = p_market_id and m.status = 'open'
  for update;

  if not found then
    raise exception 'Market not open or not found';
  end if;

  if not public.is_group_admin(v_group_id) then
    raise exception 'Only group owner/admin can settle';
  end if;

  update public.markets
  set status = 'settled',
      winning_selection = p_winning_selection
  where id = p_market_id;

  select coalesce(sum(amount), 0)
  into v_total_pool
  from public.bets
  where market_id = p_market_id;

  select coalesce(sum(amount), 0)
  into v_winning_pool
  from public.bets
  where market_id = p_market_id
    and selection = p_winning_selection;

  update public.bets
  set result = 'lost'
  where market_id = p_market_id
    and selection <> p_winning_selection;

  if v_winning_pool = 0 then
    update public.bets
    set result = 'void', payout = amount
    where market_id = p_market_id;

    for v_row in
      select user_id, amount
      from public.bets
      where market_id = p_market_id
    loop
      update public.group_members
      set balance = balance + v_row.amount
      where group_id = v_group_id and user_id = v_row.user_id;

      insert into public.ledger_entries (group_id, user_id, kind, amount, reference_id, note)
      values (v_group_id, v_row.user_id, 'payout', v_row.amount, p_market_id, 'Void refund');
    end loop;

    return;
  end if;

  for v_row in
    select id, user_id, amount
    from public.bets
    where market_id = p_market_id
      and selection = p_winning_selection
  loop
    v_payout := round((v_total_pool * (v_row.amount / v_winning_pool))::numeric, 2);

    update public.bets
    set result = 'won',
        payout = v_payout
    where id = v_row.id;

    update public.group_members
    set balance = balance + v_payout
    where group_id = v_group_id and user_id = v_row.user_id;

    insert into public.ledger_entries (group_id, user_id, kind, amount, reference_id, note)
    values (v_group_id, v_row.user_id, 'payout', v_payout, p_market_id, 'Market settled');
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.markets enable row level security;
alter table public.bets enable row level security;
alter table public.ledger_entries enable row level security;

create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "groups_select_member_only"
on public.groups for select
to authenticated
using (public.is_group_member(id));

create policy "groups_insert_authenticated"
on public.groups for insert
to authenticated
with check (created_by = auth.uid());

create policy "group_members_select_member_only"
on public.group_members for select
to authenticated
using (public.is_group_member(group_id));

create policy "group_members_insert_self"
on public.group_members for insert
to authenticated
with check (user_id = auth.uid());

create policy "events_select_member_only"
on public.events for select
to authenticated
using (public.is_group_member(group_id));

create policy "events_insert_member_only"
on public.events for insert
to authenticated
with check (public.is_group_member(group_id));

create policy "markets_select_member_only"
on public.markets for select
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = markets.event_id
      and public.is_group_member(e.group_id)
  )
);

create policy "markets_insert_member_only"
on public.markets for insert
to authenticated
with check (
  exists (
    select 1 from public.events e
    where e.id = markets.event_id
      and public.is_group_member(e.group_id)
  )
);

create policy "bets_select_group_member"
on public.bets for select
to authenticated
using (public.is_group_member(group_id));

create policy "ledger_select_group_member"
on public.ledger_entries for select
to authenticated
using (public.is_group_member(group_id));

grant execute on function public.place_bet(uuid, text, numeric) to authenticated;
grant execute on function public.settle_market(uuid, text) to authenticated;
