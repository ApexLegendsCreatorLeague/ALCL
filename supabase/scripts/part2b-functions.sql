-- Part 2B: functions and triggers (run after part2a)
begin;
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
  increment_value numeric(12,2);
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

  if tg_table_name = 'community_supporters' then
    increment_value := new.annual_non_cash_value_usd;
  else
    increment_value := new.fair_market_value_usd;
  end if;

  if supporter_total + prize_total + increment_value > 10000 then
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
commit;
