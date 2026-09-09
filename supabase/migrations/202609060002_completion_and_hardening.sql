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

  if supporter_total + prize_total
     + case when tg_table_name = 'community_supporters'
            then new.annual_non_cash_value_usd else new.fair_market_value_usd end > 10000 then
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

drop policy "public read seasons" on public.seasons;
drop policy "public read tournaments" on public.tournaments;
drop policy "public read events" on public.events;
drop policy "public read scoring_configs" on public.scoring_configs;
drop policy "public read matches" on public.matches;
drop policy "public read match_teams" on public.match_teams;
drop policy "public read match_players" on public.match_players;
drop policy "public read match_results" on public.match_results;
drop policy "public read event_points" on public.event_points;
drop policy "public read season_standings" on public.season_standings;
drop policy "public read championships" on public.championships;
drop policy "public read championship_qualification" on public.championship_qualification;
drop policy "public read community_supporters" on public.community_supporters;
drop policy "public read prizes" on public.prizes;

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
