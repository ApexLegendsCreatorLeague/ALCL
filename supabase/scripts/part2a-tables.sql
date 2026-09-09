-- Part 2A: tables only (run after part1)
begin;

create type public.lineup_role as enum ('active', 'substitute', 'observer');
create type public.attestation_type as enum ('asset_rights', 'code_of_conduct', 'eligibility', 'moderation');
create type public.external_source_type as enum ('game_api', 'rank_provider', 'broadcast', 'identity', 'other');

create table public.eligibility_configs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  version integer not null check (version > 0),
  min_age integer check (min_age between 13 and 99),
  allowed_country_codes text[] not null default array['US']::text[],
  residency_required boolean not null default false,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (tournament_id, version),
  check (not ('TR' = any(allowed_country_codes)))
);

create table public.rank_snapshots (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  rank text not null,
  source text not null,
  captured_at timestamptz not null,
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  content_hash text not null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(player_id, team_id) = 1)
);
create index rank_snapshots_tournament_captured_idx
  on public.rank_snapshots(tournament_id, captured_at desc);

create table public.config_snapshots (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  scoring_config jsonb not null check (jsonb_typeof(scoring_config) = 'object'),
  eligibility_config jsonb not null check (jsonb_typeof(eligibility_config) = 'object'),
  rules_config jsonb not null check (jsonb_typeof(rules_config) = 'object'),
  content_hash text not null,
  captured_by uuid not null references public.profiles(id),
  captured_at timestamptz not null default now()
);
create index config_snapshots_tournament_captured_idx
  on public.config_snapshots(tournament_id, captured_at desc);

create table public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  team_id uuid not null,
  submitted_by uuid not null references public.profiles(id),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id),
  unique (id, match_id, team_id),
  foreign key (match_id, team_id)
    references public.match_teams(match_id, team_id) on delete cascade
);

alter table public.match_players
  add column match_lineup_id uuid not null,
  add column role public.lineup_role not null default 'active';
alter table public.match_players
  add constraint match_players_role_consistency
  check ((role = 'substitute') = is_substitute),
  add constraint match_players_lineup_fk
  foreign key (match_lineup_id, match_id, team_id)
  references public.match_lineups(id, match_id, team_id) on delete cascade;
create index match_players_lineup_role_idx on public.match_players(match_lineup_id, role);

create table public.registration_contacts (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  contact_name_encrypted text not null,
  contact_email_encrypted text not null,
  contact_phone_encrypted text,
  email_lookup_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.moderation_asset_attestations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  type public.attestation_type not null,
  asset_path text,
  statement text not null,
  accepted boolean not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  attested_at timestamptz not null default now(),
  expires_at timestamptz,
  check (team_id is not null or tournament_id is not null or asset_path is not null),
  check (expires_at is null or expires_at > attested_at)
);
create index attestations_profile_type_idx
  on public.moderation_asset_attestations(profile_id, type, attested_at desc);

create table public.external_data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type public.external_source_type not null,
  base_url text not null check (base_url ~ '^https://'),
  public_config jsonb not null default '{}'::jsonb check (jsonb_typeof(public_config) = 'object'),
  secret_reference text,
  is_active boolean not null default false check (not is_active),
  last_synced_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index eligibility_configs_tournament_idx on public.eligibility_configs(tournament_id, version desc);
create index match_lineups_match_idx on public.match_lineups(match_id, team_id);
create index external_data_sources_active_idx on public.external_data_sources(is_active) where is_active;
create index registration_contacts_email_hash_idx on public.registration_contacts(email_lookup_hash);
commit;
