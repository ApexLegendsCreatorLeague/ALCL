-- Part 2C: policies and views (run after part2b)
begin;
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
commit;
