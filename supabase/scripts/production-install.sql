begin;

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('player', 'team_manager', 'organizer', 'admin', 'moderator', 'scorer');
create type public.record_status as enum ('draft', 'published', 'archived');
create type public.competition_status as enum ('draft', 'registration', 'scheduled', 'active', 'complete', 'cancelled');
create type public.registration_status as enum ('pending', 'approved', 'needs_changes', 'rejected', 'withdrawn');
create type public.match_status as enum ('scheduled', 'check_in', 'live', 'submitted', 'verified', 'disputed', 'complete', 'cancelled');
create type public.notification_kind as enum ('info', 'registration', 'match', 'result', 'policy', 'security');
create type public.audit_action as enum ('insert', 'update', 'delete', 'auth', 'role_change', 'publish', 'verify');
create type public.prize_kind as enum ('non_cash', 'cash');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 50),
  username text unique check (username is null or username ~ '^[A-Za-z0-9_]{3,30}$'),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  avatar_path text,
  bio text check (bio is null or char_length(bio) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_roles (
  role public.app_role primary key,
  description text not null,
  is_privileged boolean not null default false
);

insert into public.app_roles (role, description, is_privileged) values
  ('player', 'Competition participant', false),
  ('team_manager', 'Team manager', false),
  ('organizer', 'League and event organizer', true),
  ('admin', 'Platform administrator', true),
  ('moderator', 'Community moderator', true),
  ('scorer', 'Match score verifier', true);

create table public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null references public.app_roles(role),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (profile_id, role),
  check (expires_at is null or expires_at > granted_at)
);

create table public.compliance_settings (
  id boolean primary key default true check (id),
  community_mode boolean not null default true check (community_mode),
  commercial_authorization_enabled boolean not null default false check (not commercial_authorization_enabled),
  cash_prize_usd numeric(12,2) not null default 0 check (cash_prize_usd = 0),
  annual_prize_value_limit_usd numeric(12,2) not null default 10000 check (annual_prize_value_limit_usd = 10000),
  disabled_country_codes text[] not null default array['TR']::text[] check ('TR' = any(disabled_country_codes)),
  policy_reviewed_at date not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.compliance_settings (policy_reviewed_at) values ('2026-09-05');

create table public.prohibited_supporter_categories (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.prohibited_supporter_categories (slug, label)
select slug, initcap(replace(slug, '-', ' '))
from unnest(array[
  'adult-content','contraceptives','online-dating','alcohol','tobacco','restricted-drugs',
  'drug-paraphernalia','firearms','weapons','explosives','tattoos-body-branding','gambling',
  'sports-betting','daily-fantasy','lottery','political-promotion','illegal-services',
  'misleading-or-discriminatory-content','pharmaceuticals','dietary-supplements',
  'medical-devices','energy-drinks','cryptocurrency','competing-games','competing-esports',
  'account-selling','coin-or-gold-selling','hacking-services','rating-inconsistent'
]) as slug;

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  country_code text not null default 'US' check (country_code ~ '^[A-Z]{2}$' and country_code <> 'TR'),
  owner_id uuid not null references public.profiles(id),
  status public.record_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  starts_on date not null,
  ends_on date not null,
  status public.competition_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, slug),
  check (ends_on >= starts_on)
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  format text not null default 'online' check (format = 'online'),
  country_code text not null check (country_code ~ '^[A-Z]{2}$' and country_code <> 'TR'),
  status public.competition_status not null default 'draft',
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  max_teams integer check (max_teams is null or max_teams > 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, slug),
  check (registration_closes_at is null or registration_opens_at is null or registration_closes_at > registration_opens_at),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  sequence integer not null check (sequence > 0),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.competition_status not null default 'scheduled',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, sequence),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null check (char_length(short_name) between 2 and 8),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  captain_id uuid not null references public.profiles(id),
  logo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  platform text check (platform in ('pc', 'playstation', 'xbox', 'switch')),
  country_code text not null check (country_code ~ '^[A-Z]{2}$' and country_code <> 'TR'),
  rank text check (rank in ('Rookie','Bronze','Silver','Gold','Platinum','Diamond','Master','Predator')),
  rank_captured_at timestamptz,
  eligibility_verified_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_players (
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  is_captain boolean not null default false,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (team_id, player_id, joined_at),
  check (left_at is null or left_at > joined_at)
);

create unique index team_players_one_active_team on public.team_players(player_id) where left_at is null;
create unique index team_players_one_captain on public.team_players(team_id) where is_captain and left_at is null;

create table public.rosters (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null default 'Competition roster',
  locked_at timestamptz,
  submitted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, tournament_id)
);

create table public.roster_players (
  roster_id uuid not null references public.rosters(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  slot smallint not null check (slot between 1 and 5),
  is_substitute boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (roster_id, player_id),
  unique (roster_id, slot)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  roster_id uuid not null references public.rosters(id) on delete restrict,
  submitted_by uuid not null references public.profiles(id),
  status public.registration_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, team_id)
);

create table public.registration_snapshots (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete restrict,
  version integer not null check (version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  content_hash text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (registration_id, version)
);

create table public.scoring_configs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  name text not null,
  placement_points jsonb not null check (jsonb_typeof(placement_points) = 'object'),
  points_per_kill numeric(8,2) not null default 1 check (points_per_kill >= 0),
  bonus_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(bonus_rules) = 'array'),
  penalty_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(penalty_rules) = 'array'),
  match_multipliers jsonb not null default '{}'::jsonb check (jsonb_typeof(match_multipliers) = 'object'),
  tiebreakers jsonb not null default '[]'::jsonb check (jsonb_typeof(tiebreakers) = 'array'),
  max_matches integer check (max_matches is null or max_matches > 0),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((tournament_id is not null)::integer + (event_id is not null)::integer = 1)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  scoring_config_id uuid not null references public.scoring_configs(id),
  sequence integer not null check (sequence > 0),
  map_name text,
  lobby_code text,
  starts_at timestamptz,
  status public.match_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, sequence)
);

create table public.match_teams (
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  seed integer check (seed is null or seed > 0),
  checked_in_at timestamptz,
  primary key (match_id, team_id),
  unique (match_id, seed)
);

create table public.match_players (
  match_id uuid not null,
  team_id uuid not null,
  player_id uuid not null references public.players(id) on delete restrict,
  is_substitute boolean not null default false,
  checked_in_at timestamptz,
  primary key (match_id, player_id),
  foreign key (match_id, team_id) references public.match_teams(match_id, team_id) on delete cascade
);

create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  team_id uuid not null,
  placement integer not null check (placement > 0),
  kills integer not null default 0 check (kills >= 0),
  placement_points numeric(10,2) not null default 0 check (placement_points >= 0),
  kill_points numeric(10,2) not null default 0 check (kill_points >= 0),
  bonus_points numeric(10,2) not null default 0,
  penalty_points numeric(10,2) not null default 0 check (penalty_points >= 0),
  total_points numeric(10,2) generated always as (placement_points + kill_points + bonus_points - penalty_points) stored,
  evidence_path text,
  submitted_by uuid not null references public.profiles(id),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id),
  unique (match_id, placement),
  foreign key (match_id, team_id) references public.match_teams(match_id, team_id) on delete restrict
);

create table public.event_points (
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  match_points numeric(12,2) not null default 0,
  bonus_points numeric(12,2) not null default 0,
  penalty_points numeric(12,2) not null default 0 check (penalty_points >= 0),
  total_points numeric(12,2) generated always as (match_points + bonus_points - penalty_points) stored,
  kills integer not null default 0 check (kills >= 0),
  wins integer not null default 0 check (wins >= 0),
  placement integer check (placement is null or placement > 0),
  finalized_at timestamptz,
  primary key (event_id, team_id)
);

create table public.season_standings (
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  season_points numeric(12,2) not null default 0,
  kills integer not null default 0 check (kills >= 0),
  wins integer not null default 0 check (wins >= 0),
  events_played integer not null default 0 check (events_played >= 0),
  rank integer check (rank is null or rank > 0),
  updated_at timestamptz not null default now(),
  primary key (season_id, team_id),
  unique (season_id, rank)
);

create table public.championships (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null unique references public.seasons(id) on delete cascade,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  max_teams integer not null check (max_teams > 1),
  status public.competition_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.championship_qualification (
  championship_id uuid not null references public.championships(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  season_rank integer not null check (season_rank > 0),
  qualification_reason text not null,
  qualified_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (championship_id, team_id),
  unique (championship_id, season_rank)
);

create table public.community_supporters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category ~ '^[a-z0-9-]+$'),
  website_url text,
  logo_path text,
  annual_non_cash_value_usd numeric(12,2) not null default 0 check (annual_non_cash_value_usd >= 0),
  starts_on date not null,
  ends_on date,
  approved_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.prizes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  championship_id uuid references public.championships(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  kind public.prize_kind not null default 'non_cash' check (kind = 'non_cash'),
  description text not null,
  cash_value_usd numeric(12,2) not null default 0 check (cash_value_usd = 0),
  fair_market_value_usd numeric(12,2) not null check (fair_market_value_usd >= 0),
  awarded_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check ((season_id is not null)::integer + (tournament_id is not null)::integer + (championship_id is not null)::integer = 1)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null default 'info',
  title text not null check (char_length(title) <= 120),
  body text not null check (char_length(body) <= 2000),
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues(id) on delete cascade,
  title text not null,
  body text not null,
  status public.record_status not null default 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  version integer not null check (version > 0),
  title text not null,
  body text not null,
  content_hash text not null,
  status public.record_status not null default 'draft',
  effective_at timestamptz,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique nulls not distinct (league_id, tournament_id, version),
  check ((league_id is not null)::integer + (tournament_id is not null)::integer = 1),
  check (status <> 'published' or (published_at is not null and effective_at is not null))
);

create table public.legal_policies (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version integer not null check (version > 0),
  title text not null,
  body text not null,
  content_hash text not null,
  is_required boolean not null default true,
  published_at timestamptz,
  effective_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (slug, version),
  check (published_at is null or effective_at is not null)
);

create table public.policy_acceptances (
  policy_id uuid not null references public.legal_policies(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  ip_hash text,
  user_agent_hash text,
  primary key (policy_id, profile_id)
);

create table public.rate_limit_counters (
  scope text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  expires_at timestamptz not null,
  primary key (scope, subject_hash, window_started_at),
  check (expires_at > window_started_at)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  action public.audit_action not null,
  schema_name text not null default 'public',
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  request_id text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create index profiles_username_idx on public.profiles(lower(username));
create index seasons_league_idx on public.seasons(league_id, starts_on desc);
create index tournaments_season_idx on public.tournaments(season_id, starts_at);
create index events_tournament_idx on public.events(tournament_id, sequence);
create index players_profile_idx on public.players(profile_id);
create index team_players_active_idx on public.team_players(team_id, player_id) where left_at is null;
create index registrations_status_idx on public.registrations(tournament_id, status);
create index matches_event_idx on public.matches(event_id, sequence);
create index match_results_match_idx on public.match_results(match_id, total_points desc);
create index event_points_rank_idx on public.event_points(event_id, total_points desc);
create index season_standings_rank_idx on public.season_standings(season_id, rank);
create index notifications_unread_idx on public.notifications(profile_id, created_at desc) where read_at is null;
create index announcements_public_idx on public.announcements(published_at desc) where status = 'published';
create index audit_logs_record_idx on public.audit_logs(table_name, record_id, occurred_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_id, occurred_at desc);
create index rate_limit_expiry_idx on public.rate_limit_counters(expires_at);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$ select auth.uid() $$;

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profile_roles pr
    where pr.profile_id = auth.uid()
      and pr.role = required_role
      and (pr.expires_at is null or pr.expires_at > now())
  );
$$;

create or replace function public.can_manage_competitions()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin') or public.has_role('organizer');
$$;

create or replace function public.is_team_captain(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teams t
    where t.id = target_team and t.captain_id = auth.uid()
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Player'),
    nullif(trim(new.raw_user_meta_data ->> 'username'), '')
  );
  insert into public.profile_roles (profile_id, role) values (new.id, 'player');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.guard_compliance()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  annual_total numeric(12,2);
begin
  if tg_table_name in ('leagues', 'tournaments', 'players') then
    if new.country_code = 'TR' then
      raise exception 'ALCL community tournaments are unavailable in Turkey'
        using errcode = '23514';
    end if;
  end if;

  if tg_table_name = 'community_supporters' then
    if exists (
      select 1 from public.prohibited_supporter_categories p
      where p.slug = new.category and p.active
    ) then
      raise exception 'Supporter category % is prohibited', new.category
        using errcode = '23514';
    end if;
    select coalesce(sum(s.annual_non_cash_value_usd), 0)
      into annual_total
      from public.community_supporters s
      where extract(year from s.starts_on) = extract(year from new.starts_on)
        and s.id is distinct from new.id;
    if annual_total + new.annual_non_cash_value_usd > 10000 then
      raise exception 'Annual community prize/support value exceeds USD 10,000'
        using errcode = '23514';
    end if;
  end if;

  if tg_table_name = 'prizes' then
    if new.kind <> 'non_cash' or new.cash_value_usd <> 0 then
      raise exception 'Cash prizes are disabled in community mode'
        using errcode = '23514';
    end if;
    select coalesce(sum(p.fair_market_value_usd), 0)
      into annual_total
      from public.prizes p
      where extract(year from coalesce(p.awarded_at, p.created_at)) =
            extract(year from coalesce(new.awarded_at, new.created_at))
        and p.id is distinct from new.id;
    if annual_total + new.fair_market_value_usd > 10000 then
      raise exception 'Annual prize fair-market value exceeds USD 10,000'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger leagues_compliance before insert or update on public.leagues
for each row execute function public.guard_compliance();
create trigger tournaments_compliance before insert or update on public.tournaments
for each row execute function public.guard_compliance();
create trigger players_compliance before insert or update on public.players
for each row execute function public.guard_compliance();
create trigger supporters_compliance before insert or update on public.community_supporters
for each row execute function public.guard_compliance();
create trigger prizes_compliance before insert or update on public.prizes
for each row execute function public.guard_compliance();

create or replace function public.guard_published_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('registration', 'scheduled', 'active') and not exists (
    select 1 from public.rules r
    where r.tournament_id = new.id
      and r.status = 'published'
      and r.published_at <= now()
      and r.effective_at <= now()
  ) then
    raise exception 'Tournament requires published, effective rules before opening'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger tournaments_rules_gate before insert or update of status on public.tournaments
for each row execute function public.guard_published_rules();

create or replace function public.guard_roster_size()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  player_count integer;
  substitute_count integer;
begin
  select count(*), count(*) filter (where is_substitute)
    into player_count, substitute_count
    from public.roster_players
    where roster_id = new.roster_id and player_id <> new.player_id;
  if player_count + 1 > 5 or substitute_count + (new.is_substitute::integer) > 2 then
    raise exception 'Roster permits at most five players and two substitutes'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger roster_size_guard before insert or update on public.roster_players
for each row execute function public.guard_roster_size();

create or replace function public.guard_match_lineup()
returns trigger
language plpgsql
set search_path = ''
as $$
declare lineup_count integer;
begin
  select count(*) into lineup_count
  from public.match_players
  where match_id = new.match_id and team_id = new.team_id and player_id <> new.player_id;
  if lineup_count + 1 > 5 then
    raise exception 'Match lineup permits at most five players'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger match_lineup_guard before insert or update on public.match_players
for each row execute function public.guard_match_lineup();

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_id text;
begin
  row_id := coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id'));
  insert into public.audit_logs (
    actor_id, action, schema_name, table_name, record_id, old_data, new_data, request_id
  ) values (
    auth.uid(),
    case tg_op when 'INSERT' then 'insert'::public.audit_action
               when 'UPDATE' then 'update'::public.audit_action
               else 'delete'::public.audit_action end,
    tg_table_schema, tg_table_name, row_id,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-request-id', '')
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit records are immutable' using errcode = '55000';
end;
$$;

create trigger audit_logs_immutable before update or delete on public.audit_logs
for each row execute function public.prevent_audit_mutation();
create trigger audit_logs_no_truncate before truncate on public.audit_logs
for each statement execute function public.prevent_audit_mutation();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','profile_roles','leagues','seasons','tournaments','events','teams','players',
    'team_players','rosters','roster_players','registrations','registration_snapshots',
    'scoring_configs','matches','match_teams','match_players','match_results','event_points',
    'season_standings','championships','championship_qualification','community_supporters',
    'prizes','announcements','rules','legal_policies','policy_acceptances'
  ] loop
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
      table_name, table_name
    );
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','leagues','seasons','tournaments','events','teams','players','rosters',
    'registrations','scoring_configs','matches','match_results','season_standings',
    'championships','community_supporters','announcements'
  ] loop
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end $$;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_limit <= 0 or p_window_seconds <= 0 or length(p_subject_hash) < 16 then
    raise exception 'Invalid rate-limit parameters' using errcode = '22023';
  end if;
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  insert into public.rate_limit_counters(scope, subject_hash, window_started_at, request_count, expires_at)
  values (p_scope, p_subject_hash, v_window, 1, v_window + make_interval(secs => p_window_seconds))
  on conflict (scope, subject_hash, window_started_at)
  do update set request_count = public.rate_limit_counters.request_count + 1
  returning request_count into v_count;
  return query select v_count <= p_limit, greatest(p_limit - v_count, 0),
    v_window + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

alter table public.profiles enable row level security;
alter table public.app_roles enable row level security;
alter table public.profile_roles enable row level security;
alter table public.compliance_settings enable row level security;
alter table public.prohibited_supporter_categories enable row level security;
alter table public.leagues enable row level security;
alter table public.seasons enable row level security;
alter table public.tournaments enable row level security;
alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.team_players enable row level security;
alter table public.rosters enable row level security;
alter table public.roster_players enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_snapshots enable row level security;
alter table public.scoring_configs enable row level security;
alter table public.matches enable row level security;
alter table public.match_teams enable row level security;
alter table public.match_players enable row level security;
alter table public.match_results enable row level security;
alter table public.event_points enable row level security;
alter table public.season_standings enable row level security;
alter table public.championships enable row level security;
alter table public.championship_qualification enable row level security;
alter table public.community_supporters enable row level security;
alter table public.prizes enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.rules enable row level security;
alter table public.legal_policies enable row level security;
alter table public.policy_acceptances enable row level security;
alter table public.rate_limit_counters enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "profile owner updates safe fields" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "roles readable" on public.app_roles for select to authenticated using (true);
create policy "own roles readable" on public.profile_roles for select to authenticated
  using (profile_id = auth.uid() or public.has_role('admin'));
create policy "admins manage roles" on public.profile_roles for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "compliance readable" on public.compliance_settings for select using (true);
create policy "prohibited categories readable" on public.prohibited_supporter_categories for select using (true);

create policy "published leagues readable" on public.leagues for select
  using (status = 'published' or public.can_manage_competitions() or owner_id = auth.uid());
create policy "organizers manage leagues" on public.leagues for all to authenticated
  using (public.can_manage_competitions()) with check (public.can_manage_competitions());

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'event_points','season_standings','championships','championship_qualification',
    'community_supporters','prizes'
  ] loop
    execute format('create policy "public read %1$s" on public.%1$I for select using (true)', table_name);
  end loop;
  foreach table_name in array array[
    'seasons','tournaments','events','scoring_configs','matches','match_teams','match_players',
    'match_results','event_points','season_standings','championships','championship_qualification',
    'community_supporters','prizes'
  ] loop
    execute format(
      'create policy "competition managers write %1$s" on public.%1$I for all to authenticated using (public.can_manage_competitions()) with check (public.can_manage_competitions())',
      table_name
    );
  end loop;
end $$;

create policy "visible seasons" on public.seasons for select
  using (status <> 'draft' or public.can_manage_competitions());
create policy "visible tournaments" on public.tournaments for select
  using (status <> 'draft' or public.can_manage_competitions());
create policy "published events" on public.events for select
  using (published_at <= now() or public.can_manage_competitions());
create policy "active scoring configs" on public.scoring_configs for select
  using (is_active or public.can_manage_competitions());
create policy "authorized matches" on public.matches for select
  using (
    status = 'complete'
    or public.can_manage_competitions()
    or exists (
      select 1 from public.match_teams mt
      join public.teams t on t.id = mt.team_id
      where mt.match_id = matches.id and t.captain_id = auth.uid()
    )
  );
create policy "visible match teams" on public.match_teams for select
  using (
    public.can_manage_competitions()
    or exists (select 1 from public.matches m where m.id = match_id and m.status = 'complete')
    or exists (select 1 from public.teams t where t.id = team_id and t.captain_id = auth.uid())
  );
create policy "visible match players" on public.match_players for select
  using (
    public.can_manage_competitions()
    or exists (select 1 from public.matches m where m.id = match_id and m.status = 'complete')
    or exists (select 1 from public.teams t where t.id = team_id and t.captain_id = auth.uid())
  );
create policy "verified match results" on public.match_results for select
  using (
    verified_at is not null
    or public.can_manage_competitions()
    or exists (select 1 from public.teams t where t.id = team_id and t.captain_id = auth.uid())
  );

create policy "teams readable" on public.teams for select using (true);
create policy "captains create teams" on public.teams for insert to authenticated
  with check (captain_id = auth.uid());
create policy "captains manage teams" on public.teams for update to authenticated
  using (public.is_team_captain(id) or public.can_manage_competitions())
  with check (public.is_team_captain(id) or public.can_manage_competitions());
create policy "players readable" on public.players for select using (true);
create policy "player owns record" on public.players for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "team membership readable" on public.team_players for select using (true);
create policy "captains manage membership" on public.team_players for all to authenticated
  using (public.is_team_captain(team_id) or public.can_manage_competitions())
  with check (public.is_team_captain(team_id) or public.can_manage_competitions());
create policy "captains read rosters" on public.rosters for select to authenticated
  using (public.is_team_captain(team_id) or public.can_manage_competitions());
create policy "captains manage rosters" on public.rosters for all to authenticated
  using (public.is_team_captain(team_id) or public.can_manage_competitions())
  with check (public.is_team_captain(team_id) or public.can_manage_competitions());
create policy "roster players visible to authorized" on public.roster_players for select to authenticated
  using (exists (
    select 1 from public.rosters r where r.id = roster_id
      and (public.is_team_captain(r.team_id) or public.can_manage_competitions())
  ));
create policy "captains manage roster players" on public.roster_players for all to authenticated
  using (exists (
    select 1 from public.rosters r where r.id = roster_id
      and (public.is_team_captain(r.team_id) or public.can_manage_competitions())
  )) with check (exists (
    select 1 from public.rosters r where r.id = roster_id
      and (public.is_team_captain(r.team_id) or public.can_manage_competitions())
  ));
create policy "registration participants read" on public.registrations for select to authenticated
  using (public.is_team_captain(team_id) or public.can_manage_competitions());
create policy "captains submit registration" on public.registrations for insert to authenticated
  with check (public.is_team_captain(team_id) and submitted_by = auth.uid() and status = 'pending');
create policy "managers review registration" on public.registrations for update to authenticated
  using (public.can_manage_competitions()) with check (public.can_manage_competitions());
create policy "snapshots authorized read" on public.registration_snapshots for select to authenticated
  using (exists (
    select 1 from public.registrations r where r.id = registration_id
      and (public.is_team_captain(r.team_id) or public.can_manage_competitions())
  ));
create policy "snapshots authorized insert" on public.registration_snapshots for insert to authenticated
  with check (created_by = auth.uid() and exists (
    select 1 from public.registrations r where r.id = registration_id
      and (public.is_team_captain(r.team_id) or public.can_manage_competitions())
  ));
create policy "own notifications" on public.notifications for select to authenticated using (profile_id = auth.uid());
create policy "own notifications read" on public.notifications for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "service creates notifications" on public.notifications for insert to service_role with check (true);
create policy "published announcements" on public.announcements for select
  using (status = 'published' and published_at <= now() and (expires_at is null or expires_at > now())
    or public.can_manage_competitions());
create policy "managers manage announcements" on public.announcements for all to authenticated
  using (public.can_manage_competitions()) with check (public.can_manage_competitions());
create policy "published rules" on public.rules for select
  using (status = 'published' and published_at <= now() or public.can_manage_competitions());
create policy "managers manage rules" on public.rules for all to authenticated
  using (public.can_manage_competitions()) with check (public.can_manage_competitions());
create policy "published legal policies" on public.legal_policies for select using (published_at <= now());
create policy "admins manage legal policies" on public.legal_policies for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "own policy acceptances" on public.policy_acceptances for select to authenticated
  using (profile_id = auth.uid());
create policy "accept own policy" on public.policy_acceptances for insert to authenticated
  with check (profile_id = auth.uid());
create policy "admins read audit" on public.audit_logs for select to authenticated
  using (public.has_role('admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('team-logos', 'team-logos', true, 2097152, array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('match-evidence', 'match-evidence', false, 10485760, array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public media readable" on storage.objects for select
  using (bucket_id in ('avatars','team-logos'));
create policy "users upload own avatars" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own avatars" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner_id = auth.uid()::text)
  with check (bucket_id = 'avatars' and owner_id = auth.uid()::text);
create policy "captains manage team logos" on storage.objects for all to authenticated
  using (
    bucket_id = 'team-logos' and exists (
      select 1 from public.teams t
      where t.id::text = (storage.foldername(storage.objects.name))[1]
        and (t.captain_id = auth.uid() or public.can_manage_competitions())
    )
  ) with check (
    bucket_id = 'team-logos' and exists (
      select 1 from public.teams t
      where t.id::text = (storage.foldername(storage.objects.name))[1]
        and (t.captain_id = auth.uid() or public.can_manage_competitions())
    )
  );
create policy "authorized evidence read" on storage.objects for select to authenticated
  using (
    bucket_id = 'match-evidence' and exists (
      select 1 from public.matches m
      join public.events e on e.id = m.event_id
      join public.match_teams mt on mt.match_id = m.id
      join public.teams t on t.id = mt.team_id
      where m.id::text = (storage.foldername(storage.objects.name))[1]
        and (t.captain_id = auth.uid() or public.can_manage_competitions() or public.has_role('scorer'))
    )
  );
create policy "authorized evidence upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'match-evidence' and exists (
      select 1 from public.matches m
      join public.match_teams mt on mt.match_id = m.id
      join public.teams t on t.id = mt.team_id
      where m.id::text = (storage.foldername(storage.objects.name))[1]
        and (t.captain_id = auth.uid() or public.can_manage_competitions() or public.has_role('scorer'))
    )
  );

grant usage on schema public to anon, authenticated;
grant select on public.leagues, public.seasons, public.tournaments, public.events, public.teams,
  public.players, public.team_players, public.matches, public.match_teams, public.match_results,
  public.event_points, public.season_standings, public.championships,
  public.championship_qualification, public.community_supporters, public.prizes,
  public.announcements, public.rules, public.legal_policies,
  public.compliance_settings, public.prohibited_supporter_categories to anon, authenticated;
grant select, update on public.profiles, public.notifications to authenticated;
grant select on public.app_roles, public.profile_roles, public.rosters, public.roster_players,
  public.registrations, public.registration_snapshots, public.scoring_configs,
  public.match_players, public.policy_acceptances, public.audit_logs to authenticated;
grant insert, update, delete on public.leagues, public.seasons, public.tournaments, public.events,
  public.teams, public.players, public.team_players, public.rosters, public.roster_players,
  public.registrations, public.scoring_configs, public.matches, public.match_teams,
  public.match_players, public.match_results, public.event_points, public.season_standings,
  public.championships, public.championship_qualification, public.community_supporters,
  public.prizes, public.announcements, public.rules, public.legal_policies to authenticated;
grant insert on public.registration_snapshots, public.policy_acceptances to authenticated;
grant insert, update, delete on public.profile_roles to authenticated;
grant usage, select on all sequences in schema public to authenticated;

commit;

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

create or replace function public.canonical_json_hash(value jsonb)
returns text
language sql
immutable
strict
set search_path = ''
as $$ select encode(extensions.digest(value::text, 'sha256'), 'hex') $$;

create or replace function public.set_immutable_content_hash()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'registration_snapshots' then
    new.content_hash := public.canonical_json_hash(new.snapshot);
  elsif tg_table_name = 'rank_snapshots' then
    new.content_hash := public.canonical_json_hash(
      jsonb_build_object('rank', new.rank, 'source', new.source, 'snapshot', new.snapshot)
    );
  elsif tg_table_name = 'config_snapshots' then
    new.content_hash := public.canonical_json_hash(
      jsonb_build_object(
        'scoring', new.scoring_config,
        'eligibility', new.eligibility_config,
        'rules', new.rules_config
      )
    );
  end if;
  return new;
end;
$$;

create trigger registration_snapshot_hash before insert on public.registration_snapshots
for each row execute function public.set_immutable_content_hash();
create trigger rank_snapshot_hash before insert on public.rank_snapshots
for each row execute function public.set_immutable_content_hash();
create trigger config_snapshot_hash before insert on public.config_snapshots
for each row execute function public.set_immutable_content_hash();

create or replace function public.prevent_immutable_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% records are immutable', tg_table_name using errcode = '55000';
end;
$$;

create trigger registration_snapshots_immutable before update or delete on public.registration_snapshots
for each row execute function public.prevent_immutable_mutation();
create trigger rank_snapshots_immutable before update or delete on public.rank_snapshots
for each row execute function public.prevent_immutable_mutation();
create trigger config_snapshots_immutable before update or delete on public.config_snapshots
for each row execute function public.prevent_immutable_mutation();
create trigger eligibility_configs_immutable before update or delete on public.eligibility_configs
for each row execute function public.prevent_immutable_mutation();

create or replace function public.guard_registration_rules_and_window()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  opens_at timestamptz;
  closes_at timestamptz;
begin
  select registration_opens_at, registration_closes_at
    into opens_at, closes_at
  from public.tournaments
  where id = new.tournament_id;

  if opens_at is null or now() < opens_at or (closes_at is not null and now() > closes_at) then
    raise exception 'Tournament registration is not open' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.rules
    where tournament_id = new.tournament_id
      and status = 'published'
      and published_at <= opens_at
      and effective_at <= opens_at
  ) then
    raise exception 'Rules must be published and effective before registration opens'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger registration_rules_window
before insert on public.registrations
for each row execute function public.guard_registration_rules_and_window();

create or replace function public.guard_match_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  existing_count integer;
  capacity integer;
begin
  capacity := case new.role when 'observer' then 5 else 60 end;
  select count(*) into existing_count
  from public.match_players
  where match_id = new.match_id
    and (case when new.role = 'observer' then role = 'observer' else role <> 'observer' end)
    and player_id <> new.player_id;
  if existing_count + 1 > capacity then
    raise exception 'Match capacity exceeded for % players', new.role using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger match_capacity_guard
before insert or update on public.match_players
for each row execute function public.guard_match_capacity();

create or replace function public.guard_combined_annual_value()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_year integer;
  supporter_total numeric(12,2);
  prize_total numeric(12,2);
begin
  target_year := case
    when tg_table_name = 'community_supporters' then extract(year from new.starts_on)::integer
    else extract(year from coalesce(new.awarded_at, new.created_at))::integer
  end;
  perform pg_advisory_xact_lock(target_year);

  select coalesce(sum(annual_non_cash_value_usd), 0) into supporter_total
  from public.community_supporters
  where extract(year from starts_on) = target_year
    and (tg_table_name <> 'community_supporters' or id is distinct from new.id);
  select coalesce(sum(fair_market_value_usd), 0) into prize_total
  from public.prizes
  where extract(year from coalesce(awarded_at, created_at)) = target_year
    and (tg_table_name <> 'prizes' or id is distinct from new.id);

  if supporter_total + prize_total + case when tg_table_name = 'community_supporters' then new.annual_non_cash_value_usd else new.fair_market_value_usd end > 10000 then
    raise exception 'Combined annual supporter and prize value exceeds USD 10,000'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger supporters_combined_value before insert or update on public.community_supporters
for each row execute function public.guard_combined_annual_value();
create trigger prizes_combined_value before insert or update on public.prizes
for each row execute function public.guard_combined_annual_value();

create or replace function public.guard_supporter_in_tournament_title()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'tournaments' and exists (
    select 1 from public.community_supporters s
    where position(lower(s.name) in lower(new.name)) > 0
      and (s.ends_on is null or s.ends_on >= current_date)
  ) then
    raise exception 'Tournament title cannot contain a supporter name' using errcode = '23514';
  end if;
  if tg_table_name = 'community_supporters' and exists (
    select 1 from public.tournaments t
    where position(lower(new.name) in lower(t.name)) > 0
  ) then
    raise exception 'Supporter name conflicts with a tournament title' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger tournaments_supporter_title before insert or update of name on public.tournaments
for each row execute function public.guard_supporter_in_tournament_title();
create trigger supporters_tournament_title before insert or update of name on public.community_supporters
for each row execute function public.guard_supporter_in_tournament_title();

create trigger match_lineups_updated_at before update on public.match_lineups
for each row execute function public.set_updated_at();
create trigger external_sources_updated_at before update on public.external_data_sources
for each row execute function public.set_updated_at();
create trigger registration_contacts_updated_at before update on public.registration_contacts
for each row execute function public.set_updated_at();

create trigger eligibility_configs_audit after insert or update or delete on public.eligibility_configs
for each row execute function public.write_audit_log();
create trigger rank_snapshots_audit after insert or update or delete on public.rank_snapshots
for each row execute function public.write_audit_log();
create trigger config_snapshots_audit after insert or update or delete on public.config_snapshots
for each row execute function public.write_audit_log();
create trigger match_lineups_audit after insert or update or delete on public.match_lineups
for each row execute function public.write_audit_log();
create trigger attestations_audit after insert or update or delete on public.moderation_asset_attestations
for each row execute function public.write_audit_log();
create trigger external_sources_audit after insert or update or delete on public.external_data_sources
for each row execute function public.write_audit_log();
create trigger registration_contacts_audit after insert or update or delete on public.registration_contacts
for each row execute function public.write_audit_log();

alter table public.eligibility_configs enable row level security;
alter table public.rank_snapshots enable row level security;
alter table public.config_snapshots enable row level security;
alter table public.match_lineups enable row level security;
alter table public.moderation_asset_attestations enable row level security;
alter table public.external_data_sources enable row level security;
alter table public.registration_contacts enable row level security;

create policy "published rank snapshots" on public.rank_snapshots for select
using (exists (
  select 1 from public.tournaments t
  where t.id = tournament_id and t.status <> 'draft'
));
create policy "managers insert rank snapshots" on public.rank_snapshots for insert to authenticated
with check (public.can_manage_competitions());
create policy "managers use eligibility configs" on public.eligibility_configs for select to authenticated
using (public.can_manage_competitions());
create policy "managers insert eligibility configs" on public.eligibility_configs for insert to authenticated
with check (public.can_manage_competitions());
create policy "managers use config snapshots" on public.config_snapshots for select to authenticated
using (public.can_manage_competitions());
create policy "managers insert config snapshots" on public.config_snapshots for insert to authenticated
with check (public.can_manage_competitions());
create policy "authorized lineups read" on public.match_lineups for select to authenticated
using (public.is_team_captain(team_id) or public.can_manage_competitions());
create policy "authorized lineups write" on public.match_lineups for all to authenticated
using (public.is_team_captain(team_id) or public.can_manage_competitions())
with check (public.is_team_captain(team_id) or public.can_manage_competitions());
create policy "own or managed attestations read" on public.moderation_asset_attestations for select to authenticated
using (
  profile_id = auth.uid()
  or (team_id is not null and public.is_team_captain(team_id))
  or public.can_manage_competitions()
);
create policy "own attestations insert" on public.moderation_asset_attestations for insert to authenticated
with check (profile_id = auth.uid() or public.can_manage_competitions());
create policy "managers use external sources" on public.external_data_sources for all to authenticated
using (public.can_manage_competitions()) with check (public.can_manage_competitions());
create policy "registration contacts restricted read" on public.registration_contacts for select to authenticated
using (exists (
  select 1 from public.registrations r
  where r.id = registration_id
    and (public.is_team_captain(r.team_id) or public.can_manage_competitions())
));
create policy "registration contacts restricted write" on public.registration_contacts for all to authenticated
using (exists (
  select 1 from public.registrations r
  where r.id = registration_id
    and (public.is_team_captain(r.team_id) or public.can_manage_competitions())
)) with check (exists (
  select 1 from public.registrations r
  where r.id = registration_id
    and (public.is_team_captain(r.team_id) or public.can_manage_competitions())
));

drop policy if exists "public read seasons" on public.seasons;
drop policy if exists "public read tournaments" on public.tournaments;
drop policy if exists "public read events" on public.events;
drop policy if exists "public read scoring_configs" on public.scoring_configs;
drop policy if exists "public read matches" on public.matches;
drop policy if exists "public read match_teams" on public.match_teams;
drop policy if exists "public read match_players" on public.match_players;
drop policy if exists "public read match_results" on public.match_results;
drop policy if exists "public read event_points" on public.event_points;
drop policy if exists "public read season_standings" on public.season_standings;
drop policy if exists "public read championships" on public.championships;
drop policy if exists "public read championship_qualification" on public.championship_qualification;
drop policy if exists "public read community_supporters" on public.community_supporters;
drop policy if exists "public read prizes" on public.prizes;
drop policy if exists "visible seasons" on public.seasons;
drop policy if exists "visible tournaments" on public.tournaments;
drop policy if exists "published events" on public.events;
drop policy if exists "active scoring configs" on public.scoring_configs;
drop policy if exists "authorized matches" on public.matches;
drop policy if exists "visible match teams" on public.match_teams;
drop policy if exists "visible match players" on public.match_players;
drop policy if exists "verified match results" on public.match_results;

create policy "published seasons readable" on public.seasons for select
using (status <> 'draft' or public.can_manage_competitions());
create policy "published tournaments readable" on public.tournaments for select
using (status <> 'draft' or public.can_manage_competitions());
create policy "published events readable" on public.events for select
using (published_at is not null or public.can_manage_competitions());
create policy "published scoring configs readable" on public.scoring_configs for select
using (
  public.can_manage_competitions()
  or exists (
    select 1 from public.events e
    where e.id = scoring_configs.event_id and e.published_at is not null
  )
  or exists (
    select 1 from public.tournaments t
    where t.id = scoring_configs.tournament_id and t.status <> 'draft'
  )
);
create policy "published matches readable" on public.matches for select
using (
  public.can_manage_competitions()
  or exists (
    select 1 from public.events e
    where e.id = matches.event_id and e.published_at is not null
  )
);
create policy "published match teams readable" on public.match_teams for select
using (
  public.can_manage_competitions()
  or exists (
    select 1 from public.matches m join public.events e on e.id = m.event_id
    where m.id = match_teams.match_id and e.published_at is not null
  )
);
create policy "published match players readable" on public.match_players for select
using (
  public.can_manage_competitions()
  or exists (
    select 1 from public.matches m join public.events e on e.id = m.event_id
    where m.id = match_players.match_id and e.published_at is not null
  )
);
create policy "verified match results readable" on public.match_results for select
using (verified_at is not null or public.can_manage_competitions());
create policy "published event points readable" on public.event_points for select
using (
  public.can_manage_competitions()
  or exists (
    select 1 from public.events e
    where e.id = event_points.event_id and e.published_at is not null
  )
);
create policy "published standings readable" on public.season_standings for select
using (
  public.can_manage_competitions()
  or exists (
    select 1 from public.seasons s
    where s.id = season_standings.season_id and s.status <> 'draft'
  )
);
create policy "published championships readable" on public.championships for select
using (status <> 'draft' or public.can_manage_competitions());
create policy "published qualifications readable" on public.championship_qualification for select
using (
  public.can_manage_competitions()
  or exists (
    select 1 from public.championships c
    where c.id = championship_qualification.championship_id and c.status <> 'draft'
  )
);
create policy "supporters readable" on public.community_supporters for select
using (starts_on <= current_date and (ends_on is null or ends_on >= current_date)
       or public.can_manage_competitions());
create policy "awarded prizes readable" on public.prizes for select
using (awarded_at is not null or public.can_manage_competitions());

create or replace view public.published_tournaments
with (security_invoker = true) as
select id, season_id, name, slug, format, country_code, status,
       registration_opens_at, registration_closes_at, starts_at, ends_at, max_teams
from public.tournaments
where status <> 'draft';

create or replace view public.published_rules
with (security_invoker = true) as
select id, league_id, tournament_id, version, title, body, content_hash,
       effective_at, published_at
from public.rules
where status = 'published' and published_at <= now();

create or replace view public.public_standings
with (security_invoker = true) as
select ss.season_id, ss.team_id, t.name as team_name, t.short_name,
       ss.season_points, ss.kills, ss.wins, ss.events_played, ss.rank, ss.updated_at
from public.season_standings ss
join public.teams t on t.id = ss.team_id
join public.seasons s on s.id = ss.season_id
where s.status <> 'draft';

create or replace view public.public_match_results
with (security_invoker = true) as
select mr.match_id, mr.team_id, t.name as team_name, mr.placement, mr.kills,
       mr.total_points, mr.verified_at
from public.match_results mr
join public.teams t on t.id = mr.team_id
where mr.verified_at is not null;

grant select on public.rank_snapshots, public.published_tournaments,
  public.published_rules, public.public_standings, public.public_match_results to anon, authenticated;
grant select on public.eligibility_configs, public.config_snapshots, public.match_lineups,
  public.moderation_asset_attestations, public.external_data_sources,
  public.registration_contacts to authenticated;
grant insert on public.eligibility_configs, public.rank_snapshots, public.config_snapshots,
  public.moderation_asset_attestations to authenticated;
grant insert, update, delete on public.match_lineups, public.external_data_sources to authenticated;
grant insert, update, delete on public.registration_contacts to authenticated;

commit;

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

