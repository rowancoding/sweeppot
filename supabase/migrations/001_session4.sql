-- Session 4 migrations — run in Supabase SQL Editor
-- Adds invite_code and draw_mode to the pools table

alter table public.pools
  add column if not exists invite_code text unique,
  add column if not exists draw_mode   text not null default 'automatic';

-- Back-fill existing rows with a random invite code
update public.pools
set invite_code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where invite_code is null;

-- Make invite_code non-nullable now that existing rows are filled
alter table public.pools
  alter column invite_code set not null;

-- Index for fast look-up by invite code
create unique index if not exists pools_invite_code_idx on public.pools (invite_code);

-- Allow anyone to look up a pool by invite code (needed for /join/[code])
create policy "pools_select_by_invite_code" on public.pools for select
  using (true);   -- read is safe: no sensitive data beyond what the invite already reveals
