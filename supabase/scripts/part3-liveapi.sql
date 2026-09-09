begin;

alter table public.external_data_sources
  drop constraint if exists external_data_sources_is_active_check,
  add column provider_key text unique,
  add column authorization_reference text,
  add column approved_by uuid references public.profiles(id),
  add column approved_at timestamptz,
  add constraint external_source_activation_requires_authorization
    check (
      not is_active
      or (
        authorization_reference is not null
        and approved_by is not null
        and approved_at is not null
      )
    );

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

create table public.liveapi_sessions (
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

create index liveapi_sessions_match_status_idx
  on public.liveapi_sessions(match_id, status, last_event_at desc);

create table public.liveapi_events (
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

create index liveapi_events_session_type_idx
  on public.liveapi_events(session_id, event_type, sequence);

create table public.liveapi_team_bindings (
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

create table public.liveapi_player_states (
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

create index liveapi_player_states_team_idx
  on public.liveapi_player_states(session_id, liveapi_team_key);

create table public.liveapi_team_states (
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

create unique index liveapi_team_states_placement_idx
  on public.liveapi_team_states(session_id, placement)
  where placement is not null;

create table public.match_player_results (
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

alter table public.match_results
  alter column submitted_by drop not null,
  add column ingestion_source text not null default 'manual'
    check (ingestion_source in ('manual', 'liveapi', 'authorized_provider')),
  add column source_session_id uuid references public.liveapi_sessions(id) on delete restrict,
  add column review_status text not null default 'pending'
    check (review_status in ('pending', 'verified', 'rejected')),
  add constraint match_result_submitter_or_ingestion
    check (
      (ingestion_source = 'manual' and submitted_by is not null)
      or (ingestion_source <> 'manual' and source_session_id is not null)
    );

create trigger liveapi_sessions_updated_at
before update on public.liveapi_sessions
for each row execute function public.set_updated_at();
create trigger liveapi_bindings_updated_at
before update on public.liveapi_team_bindings
for each row execute function public.set_updated_at();
create trigger match_player_results_updated_at
before update on public.match_player_results
for each row execute function public.set_updated_at();

create trigger liveapi_events_immutable
before update or delete on public.liveapi_events
for each row execute function public.prevent_immutable_mutation();

create trigger liveapi_bindings_audit
after insert or update or delete on public.liveapi_team_bindings
for each row execute function public.write_audit_log();
create trigger match_player_results_audit
after insert or update or delete on public.match_player_results
for each row execute function public.write_audit_log();

alter table public.liveapi_sessions enable row level security;
alter table public.liveapi_events enable row level security;
alter table public.liveapi_team_bindings enable row level security;
alter table public.liveapi_player_states enable row level security;
alter table public.liveapi_team_states enable row level security;
alter table public.match_player_results enable row level security;

create policy "organizers manage liveapi sessions"
on public.liveapi_sessions for all to authenticated
using (public.can_manage_competitions())
with check (public.can_manage_competitions());
create policy "organizers read liveapi raw events"
on public.liveapi_events for select to authenticated
using (public.can_manage_competitions());
create policy "organizers manage liveapi bindings"
on public.liveapi_team_bindings for all to authenticated
using (public.can_manage_competitions())
with check (public.can_manage_competitions());
create policy "organizers read liveapi player states"
on public.liveapi_player_states for select to authenticated
using (public.can_manage_competitions());
create policy "organizers read liveapi team states"
on public.liveapi_team_states for select to authenticated
using (public.can_manage_competitions());
create policy "organizers manage match player results"
on public.match_player_results for all to authenticated
using (public.can_manage_competitions())
with check (public.can_manage_competitions());
create policy "verified match player results public"
on public.match_player_results for select to anon
using (verified_at is not null);

grant select, insert, update on public.liveapi_sessions to authenticated;
grant select on public.liveapi_events to authenticated;
grant select, insert, update, delete on public.liveapi_team_bindings to authenticated;
grant select on public.liveapi_player_states, public.liveapi_team_states to authenticated;
grant select, insert, update, delete on public.match_player_results to authenticated;
grant select on public.match_player_results to anon;

commit;
