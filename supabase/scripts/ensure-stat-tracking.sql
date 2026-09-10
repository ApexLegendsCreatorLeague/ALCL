-- ALCL stat tracking schema (LiveAPI + verified player match stats)
-- Safe to re-run. Run via: npm run db:push:stats
--
-- Tracks per player: kills, assists, knocks, damage
-- Tracks per team/match: placement, kills, points
-- Powers player profiles and event standings after organizer verify

-- ---------------------------------------------------------------------------
-- LiveAPI session status enum
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.liveapi_session_status as enum (
    'waiting',
    'playing',
    'resolution',
    'postmatch',
    'needs_mapping',
    'ready_for_review',
    'verified',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- LiveAPI ingest tables
-- ---------------------------------------------------------------------------
create table if not exists public.liveapi_sessions (
  id uuid primary key,
  source_key text not null check (source_key ~ '^[a-zA-Z0-9_-]{3,80}$'),
  match_id uuid not null references public.matches(id) on delete cascade,
  status public.liveapi_session_status not null default 'waiting',
  map_name text,
  collector_version text not null,
  last_sequence bigint not null default 0 check (last_sequence >= 0),
  raw_event_count bigint not null default 0 check (raw_event_count >= 0),
  processed_event_count bigint not null default 0 check (processed_event_count >= 0),
  last_error text,
  started_at timestamptz not null default now(),
  last_event_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, match_id, id)
);

create index if not exists liveapi_sessions_match_status_idx
  on public.liveapi_sessions(match_id, status, last_event_at desc);

create table if not exists public.liveapi_events (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  session_id uuid not null references public.liveapi_sessions(id) on delete cascade,
  sequence bigint not null check (sequence > 0),
  event_type text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  normalized jsonb not null check (jsonb_typeof(normalized) = 'object'),
  created_at timestamptz not null default now(),
  unique (session_id, sequence)
);

create index if not exists liveapi_events_session_type_idx
  on public.liveapi_events(session_id, event_type, sequence);

create table if not exists public.liveapi_team_bindings (
  session_id uuid not null references public.liveapi_sessions(id) on delete cascade,
  liveapi_team_key text not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, liveapi_team_key),
  unique (session_id, team_id)
);

create table if not exists public.liveapi_player_states (
  session_id uuid not null references public.liveapi_sessions(id) on delete cascade,
  player_key text not null,
  liveapi_team_key text not null,
  player_name text not null,
  connected boolean not null default true,
  kills integer not null default 0 check (kills >= 0),
  assists integer not null default 0 check (assists >= 0),
  damage integer not null default 0 check (damage >= 0),
  knocks integer not null default 0 check (knocks >= 0),
  updated_at timestamptz not null default now(),
  primary key (session_id, player_key)
);

create index if not exists liveapi_player_states_team_idx
  on public.liveapi_player_states(session_id, liveapi_team_key);

create table if not exists public.liveapi_team_states (
  session_id uuid not null references public.liveapi_sessions(id) on delete cascade,
  liveapi_team_key text not null,
  team_name text,
  eliminated boolean not null default false,
  placement integer check (placement is null or placement > 0),
  kills integer not null default 0 check (kills >= 0),
  assists integer not null default 0 check (assists >= 0),
  damage integer not null default 0 check (damage >= 0),
  knocks integer not null default 0 check (knocks >= 0),
  updated_at timestamptz not null default now(),
  primary key (session_id, liveapi_team_key)
);

create unique index if not exists liveapi_team_states_placement_idx
  on public.liveapi_team_states(session_id, placement)
  where placement is not null;

-- ---------------------------------------------------------------------------
-- Verified player stats (shown on /players/[id] profiles)
-- ---------------------------------------------------------------------------
create table if not exists public.match_player_results (
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  player_id uuid references public.players(id) on delete set null,
  source_player_name text not null,
  kills integer not null default 0 check (kills >= 0),
  assists integer not null default 0 check (assists >= 0),
  damage integer not null default 0 check (damage >= 0),
  knocks integer not null default 0 check (knocks >= 0),
  source_session_id uuid not null references public.liveapi_sessions(id) on delete restrict,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, source_session_id, source_player_name)
);

alter table public.match_player_results
  add column if not exists player_id uuid references public.players(id) on delete set null,
  add column if not exists source_player_name text,
  add column if not exists kills integer not null default 0,
  add column if not exists assists integer not null default 0,
  add column if not exists damage integer not null default 0,
  add column if not exists knocks integer not null default 0,
  add column if not exists source_session_id uuid,
  add column if not exists verified_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Team match results (LiveAPI + manual verify path)
-- ---------------------------------------------------------------------------
alter table public.match_results
  alter column submitted_by drop not null;

alter table public.match_results
  add column if not exists ingestion_source text not null default 'manual',
  add column if not exists source_session_id uuid references public.liveapi_sessions(id) on delete restrict,
  add column if not exists review_status text not null default 'pending';

alter table public.match_results
  drop constraint if exists match_results_ingestion_source_check;

alter table public.match_results
  add constraint match_results_ingestion_source_check
    check (ingestion_source in ('manual', 'liveapi', 'authorized_provider'));

alter table public.match_results
  drop constraint if exists match_results_review_status_check;

alter table public.match_results
  add constraint match_results_review_status_check
    check (review_status in ('pending', 'verified', 'rejected'));

alter table public.match_results
  drop constraint if exists match_result_submitter_or_ingestion;

alter table public.match_results
  add constraint match_result_submitter_or_ingestion
    check (
      (ingestion_source = 'manual' and submitted_by is not null)
      or (ingestion_source <> 'manual' and source_session_id is not null)
    );

-- ---------------------------------------------------------------------------
-- Event standings aggregation (team-level from verified match_results)
-- ---------------------------------------------------------------------------
create table if not exists public.event_points (
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  match_points numeric(12,2) not null default 0,
  bonus_points numeric(12,2) not null default 0,
  penalty_points numeric(12,2) not null default 0 check (penalty_points >= 0),
  total_points numeric(12,2) generated always as (match_points + bonus_points - penalty_points) stored,
  kills integer not null default 0 check (kills >= 0),
  wins integer not null default 0 check (wins >= 0),
  finalized_at timestamptz,
  primary key (event_id, team_id)
);

create index if not exists event_points_rank_idx
  on public.event_points(event_id, total_points desc);

-- ---------------------------------------------------------------------------
-- RLS + grants (stat tables)
-- ---------------------------------------------------------------------------
alter table public.event_points enable row level security;

alter table public.liveapi_sessions enable row level security;
alter table public.liveapi_events enable row level security;
alter table public.liveapi_team_bindings enable row level security;
alter table public.liveapi_player_states enable row level security;
alter table public.liveapi_team_states enable row level security;
alter table public.match_player_results enable row level security;

drop policy if exists "organizers manage liveapi sessions" on public.liveapi_sessions;
create policy "organizers manage liveapi sessions"
on public.liveapi_sessions for all to authenticated
using (public.can_manage_competitions())
with check (public.can_manage_competitions());

drop policy if exists "organizers read liveapi raw events" on public.liveapi_events;
create policy "organizers read liveapi raw events"
on public.liveapi_events for select to authenticated
using (public.can_manage_competitions());

drop policy if exists "organizers manage liveapi bindings" on public.liveapi_team_bindings;
create policy "organizers manage liveapi bindings"
on public.liveapi_team_bindings for all to authenticated
using (public.can_manage_competitions())
with check (public.can_manage_competitions());

drop policy if exists "organizers read liveapi player states" on public.liveapi_player_states;
create policy "organizers read liveapi player states"
on public.liveapi_player_states for select to authenticated
using (public.can_manage_competitions());

drop policy if exists "organizers read liveapi team states" on public.liveapi_team_states;
create policy "organizers read liveapi team states"
on public.liveapi_team_states for select to authenticated
using (public.can_manage_competitions());

drop policy if exists "organizers manage match player results" on public.match_player_results;
create policy "organizers manage match player results"
on public.match_player_results for all to authenticated
using (public.can_manage_competitions())
with check (public.can_manage_competitions());

drop policy if exists "verified match player results public" on public.match_player_results;
create policy "verified match player results public"
on public.match_player_results for select to anon
using (verified_at is not null);

drop policy if exists "published event points readable" on public.event_points;
create policy "published event points readable"
on public.event_points for select
using (
  public.can_manage_competitions()
  or exists (
    select 1 from public.events e
    where e.id = event_points.event_id and e.published_at is not null
  )
);

grant select, insert, update on public.liveapi_sessions to authenticated;
grant select on public.liveapi_events to authenticated;
grant select, insert, update, delete on public.liveapi_team_bindings to authenticated;
grant select on public.liveapi_player_states, public.liveapi_team_states to authenticated;
grant select, insert, update, delete on public.match_player_results to authenticated;
grant select on public.match_player_results to anon;

-- ---------------------------------------------------------------------------
-- Verify - all stat-tracking objects present
-- ---------------------------------------------------------------------------
select
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'liveapi_sessions'
  ) as has_liveapi_sessions,
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'liveapi_player_states'
  ) as has_liveapi_player_states,
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'match_player_results'
  ) as has_match_player_results,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'liveapi_player_states' and column_name = 'kills'
  ) as has_player_kills,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'liveapi_player_states' and column_name = 'assists'
  ) as has_player_assists,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'liveapi_player_states' and column_name = 'knocks'
  ) as has_player_knocks,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'liveapi_player_states' and column_name = 'damage'
  ) as has_player_damage,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'match_player_results' and column_name = 'player_id'
  ) as has_profile_player_link,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'match_results' and column_name = 'ingestion_source'
  ) as has_match_ingestion_source;
