create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_player_id text not null,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'paused', 'finished')),
  match_id uuid null,
  reconnect_deadline timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id text not null,
  name text not null,
  normalized_name text not null,
  slot_index integer not null check (slot_index between 0 and 3),
  color text null check (color in ('red', 'blue', 'yellow', 'green')),
  is_connected boolean not null default true,
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disconnected_at timestamptz null,
  left_at timestamptz null,
  updated_at timestamptz not null default now(),
  primary key (room_id, player_id)
);

create unique index if not exists room_players_active_name_idx
  on public.room_players (room_id, normalized_name)
  where left_at is null;

create unique index if not exists room_players_active_slot_idx
  on public.room_players (room_id, slot_index)
  where left_at is null;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'paused', 'finished')),
  winner text null check (winner in ('red', 'blue', 'yellow', 'green')),
  current_turn text null check (current_turn in ('red', 'blue', 'yellow', 'green')),
  reconnect_deadline timestamptz null,
  action_seq integer not null default 0,
  started_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_state (
  match_id uuid primary key references public.matches(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  action_seq integer not null default 0,
  last_action_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists match_state_room_id_idx
  on public.match_state (room_id);

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
before update on public.rooms
for each row
execute function public.touch_updated_at();

drop trigger if exists room_players_touch_updated_at on public.room_players;
create trigger room_players_touch_updated_at
before update on public.room_players
for each row
execute function public.touch_updated_at();

drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at
before update on public.matches
for each row
execute function public.touch_updated_at();

drop trigger if exists match_state_touch_updated_at on public.match_state;
create trigger match_state_touch_updated_at
before update on public.match_state
for each row
execute function public.touch_updated_at();

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.matches enable row level security;
alter table public.match_state enable row level security;

drop policy if exists "rooms_public_rw" on public.rooms;
create policy "rooms_public_rw"
on public.rooms
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "room_players_public_rw" on public.room_players;
create policy "room_players_public_rw"
on public.room_players
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "matches_public_rw" on public.matches;
create policy "matches_public_rw"
on public.matches
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "match_state_public_rw" on public.match_state;
create policy "match_state_public_rw"
on public.match_state
for all
to anon, authenticated
using (true)
with check (true);
