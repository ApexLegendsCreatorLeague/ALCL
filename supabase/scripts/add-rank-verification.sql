-- Rank verification: Apex UID, team tag attestation, and team-level tag at registration.
-- Run in Supabase SQL Editor after foundation migrations, or: npm run db:push:rank-verify

begin;

alter table public.players
  add column if not exists apex_uid text,
  add column if not exists apex_tag text,
  add column if not exists rank_verified_at timestamptz,
  add column if not exists rank_verification_source text default 'apex_stats_api';

alter table public.players
  drop constraint if exists players_apex_tag_format;

alter table public.players
  add constraint players_apex_tag_format
  check (apex_tag is null or apex_tag ~ '^[A-Z0-9]{3,4}$');

alter table public.players
  drop constraint if exists players_apex_uid_format;

alter table public.players
  add constraint players_apex_uid_format
  check (apex_uid is null or apex_uid ~ '^[0-9]+$');

alter table public.teams
  add column if not exists apex_team_tag text;

alter table public.teams
  drop constraint if exists teams_apex_team_tag_format;

alter table public.teams
  add constraint teams_apex_team_tag_format
  check (apex_team_tag is null or apex_team_tag ~ '^[A-Z0-9]{3,4}$');

create index if not exists players_apex_uid_idx on public.players (apex_uid)
  where apex_uid is not null;

create index if not exists players_rank_verified_idx on public.players (rank_verified_at desc)
  where rank_verified_at is not null;

comment on column public.players.apex_uid is
  'Stable Apex player UID from authorized stats provider (platform-scoped).';

comment on column public.players.apex_tag is
  'Apex in-game Tag (3-4 chars) the player attested at rank verification.';

comment on column public.teams.apex_team_tag is
  'Team-wide Apex Tag entered by the captain at registration; all roster players must match.';

commit;
