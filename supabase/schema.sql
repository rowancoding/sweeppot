-- ============================================================
-- Sweeppot database schema
-- Run this in the Supabase SQL Editor: supabase.com/dashboard
-- ============================================================

-- ── TABLES ───────────────────────────────────────────────────

-- 1. Users (extends auth.users)
create table if not exists public.users (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text        not null,
  display_name  text        not null,
  date_of_birth date        not null,
  created_at    timestamptz not null default now()
);

-- 2. Pools
create table if not exists public.pools (
  id                uuid        default gen_random_uuid() primary key,
  name              text        not null,
  comp              text        not null,  -- 'wc2026' | 'ucl2526' | 'euros2028'
  stage             text        not null default 'knockout', -- 'group' | 'knockout'
  bet_aud           numeric(10,2) not null default 0,
  player_count      integer     not null,
  teams_per_player  integer     not null default 1,
  status            text        not null default 'waiting', -- 'waiting' | 'active' | 'complete'
  visibility        text        not null default 'private', -- 'private' | 'public'
  organiser_id      uuid        not null references public.users(id),
  expires_at        timestamptz,
  invite_code       text        unique not null default lower(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  draw_mode         text        not null default 'automatic', -- 'automatic' | 'host' | 'live'
  created_at        timestamptz not null default now()
);

-- 3. Participants (pool membership)
create table if not exists public.participants (
  id            uuid        default gen_random_uuid() primary key,
  pool_id       uuid        not null references public.pools(id)  on delete cascade,
  user_id       uuid        not null references public.users(id)  on delete cascade,
  display_name  text        not null,
  paid          boolean     not null default false,
  spun          boolean     not null default false,
  joined_at     timestamptz not null default now(),
  unique (pool_id, user_id)
);

-- 4. Team assignments
create table if not exists public.team_assignments (
  id              uuid    default gen_random_uuid() primary key,
  pool_id         uuid    not null references public.pools(id)        on delete cascade,
  participant_id  uuid    not null references public.participants(id) on delete cascade,
  team_name       text    not null,
  team_flag       text    not null,
  team_rank       integer not null,
  tier            integer not null default 1,
  drawn_at        timestamptz not null default now()
);

-- 5. Tournament results
create table if not exists public.tournament_results (
  id          uuid    default gen_random_uuid() primary key,
  comp        text    not null,
  home_team   text    not null,
  away_team   text    not null,
  home_score  integer,
  away_score  integer,
  round       text    not null,
  played_at   timestamptz,
  created_at  timestamptz not null default now()
);

-- 6. Payouts
create table if not exists public.payouts (
  id                      uuid    default gen_random_uuid() primary key,
  pool_id                 uuid    not null references public.pools(id)        on delete cascade,
  winner_participant_id   uuid    not null references public.participants(id),
  amount_aud              numeric(10,2) not null,
  stripe_payment_intent_id text,
  status                  text    not null default 'pending', -- 'pending' | 'processing' | 'paid' | 'failed'
  paid_at                 timestamptz,
  created_at              timestamptz not null default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────

alter table public.users               enable row level security;
alter table public.pools               enable row level security;
alter table public.participants        enable row level security;
alter table public.team_assignments    enable row level security;
alter table public.tournament_results  enable row level security;
alter table public.payouts             enable row level security;

-- users: own row only
create policy "users_select_own"   on public.users for select using (auth.uid() = id);
create policy "users_insert_own"   on public.users for insert with check (auth.uid() = id);
create policy "users_update_own"   on public.users for update using (auth.uid() = id);

-- pools: read if you are a participant or organiser
create policy "pools_select_participant" on public.pools for select using (
  organiser_id = auth.uid()
  or exists (
    select 1 from public.participants
    where pool_id = pools.id and user_id = auth.uid()
  )
);
create policy "pools_insert_organiser" on public.pools for insert with check (organiser_id = auth.uid());
create policy "pools_update_organiser" on public.pools for update using (organiser_id = auth.uid());

-- participants: read all in pools you belong to
create policy "participants_select_pool_member" on public.participants for select using (
  exists (
    select 1 from public.participants p2
    where p2.pool_id = participants.pool_id and p2.user_id = auth.uid()
  )
);
create policy "participants_insert_self" on public.participants for insert with check (user_id = auth.uid());
create policy "participants_update_self" on public.participants for update using (user_id = auth.uid());

-- team_assignments: readable by pool members
create policy "team_assignments_select_pool_member" on public.team_assignments for select using (
  exists (
    select 1 from public.participants
    where pool_id = team_assignments.pool_id and user_id = auth.uid()
  )
);
create policy "team_assignments_insert_pool_member" on public.team_assignments for insert with check (
  exists (
    select 1 from public.participants
    where id = team_assignments.participant_id and user_id = auth.uid()
  )
);

-- tournament_results: public read
create policy "tournament_results_select_all" on public.tournament_results for select using (true);

-- payouts: only the winner can read their own payout
create policy "payouts_select_winner" on public.payouts for select using (
  exists (
    select 1 from public.participants
    where id = payouts.winner_participant_id and user_id = auth.uid()
  )
);

-- ── TRIGGER: auto-create user profile on signup ───────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, date_of_birth)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'date_of_birth')::date, '2000-01-01'::date)
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
