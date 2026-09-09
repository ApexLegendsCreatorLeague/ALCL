-- ALCL DEMO DATA ONLY. Every person, team, result, supporter, and URL is fictional.
-- This seed contains no real players, brands, credentials, or artwork.

begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  case when g = 0
    then '00000000-0000-0000-0000-000000000001'::uuid
    else md5('alcl-demo-user-' || g)::uuid
  end,
  'authenticated',
  'authenticated',
  case when g = 0 then 'organizer@example.invalid'
       else 'demo-player-' || lpad(g::text, 3, '0') || '@example.invalid' end,
  extensions.crypt('demo-not-for-login', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'display_name', case when g = 0 then 'Demo Organizer'
                         else 'Demo Player ' || lpad(g::text, 3, '0') end,
    'username', case when g = 0 then 'demo_organizer'
                     else 'demo_player_' || lpad(g::text, 3, '0') end
  ),
  now(),
  now()
from generate_series(0, 80) g;

update public.profiles
set country_code = 'US',
    bio = 'Fictional local-development profile.'
where id = '00000000-0000-0000-0000-000000000001'
   or id in (select md5('alcl-demo-user-' || g)::uuid from generate_series(1, 80) g);

insert into public.profile_roles (profile_id, role, granted_by)
values
  ('00000000-0000-0000-0000-000000000001', 'organizer',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001', 'admin',
   '00000000-0000-0000-0000-000000000001');

insert into public.profile_roles (profile_id, role, granted_by)
select
  md5('alcl-demo-user-' || (((g - 1) * 4) + 1))::uuid,
  'team_manager',
  '00000000-0000-0000-0000-000000000001'
from generate_series(1, 20) g;

insert into public.leagues (id, name, slug, description, country_code, owner_id, status)
values (
  '10000000-0000-0000-0000-000000000001',
  'ALCL Fictional Community League',
  'alcl-fictional-community',
  'Demo league for local development only.',
  'US',
  '00000000-0000-0000-0000-000000000001',
  'published'
);

insert into public.seasons (
  id, league_id, name, slug, starts_on, ends_on, status
) values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Fictional 2026 Season',
  'fictional-2026',
  current_date - 60,
  current_date + 120,
  'active'
);

insert into public.tournaments (
  id, season_id, name, slug, format, country_code, status,
  registration_opens_at, registration_closes_at, starts_at, ends_at, max_teams
)
select
  ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid,
  'Fictional Community Tournament ' || g,
  'fictional-community-tournament-' || g,
  'online',
  'US',
  'draft',
  now() - interval '1 day',
  now() + interval '7 days',
  now() + (g * interval '14 days'),
  now() + (g * interval '14 days') + interval '2 days',
  20
from generate_series(1, 5) g;

insert into public.rules (
  id, tournament_id, version, title, body, content_hash, status,
  effective_at, published_at, created_by
)
select
  md5('alcl-demo-rules-' || g)::uuid,
  ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
  1,
  'Fictional Competition Rules ' || g,
  'Demo rules only. Fair play, eligibility, roster locks, moderation, and result review apply.',
  public.canonical_json_hash(jsonb_build_object('demo_rules_version', g)),
  'published',
  now() - interval '2 days',
  now() - interval '2 days',
  '00000000-0000-0000-0000-000000000001'
from generate_series(1, 5) g;

update public.tournaments
set status = 'registration'
where season_id = '20000000-0000-0000-0000-000000000001';

insert into public.events (
  id, tournament_id, season_id, name, sequence, starts_at, ends_at, status, published_at
)
select
  ('31000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
  ('30000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid,
  'Fictional Event ' || g,
  1,
  now() + (g * interval '14 days'),
  now() + (g * interval '14 days') + interval '1 day',
  'scheduled',
  now() - interval '2 days'
from generate_series(1, 5) g;

insert into public.teams (id, name, short_name, slug, captain_id)
select
  md5('alcl-demo-team-' || g)::uuid,
  'Fictional Squad ' || lpad(g::text, 2, '0'),
  'FS' || lpad(g::text, 2, '0'),
  'fictional-squad-' || lpad(g::text, 2, '0'),
  md5('alcl-demo-user-' || (((g - 1) * 4) + 1))::uuid
from generate_series(1, 20) g;

insert into public.players (
  id, profile_id, platform, country_code, rank, rank_captured_at,
  eligibility_verified_at
)
select
  md5('alcl-demo-player-' || g)::uuid,
  md5('alcl-demo-user-' || g)::uuid,
  case (g % 3) when 0 then 'pc' when 1 then 'playstation' else 'xbox' end,
  'US',
  case (g % 5) when 0 then 'Gold' when 1 then 'Platinum'
       when 2 then 'Diamond' when 3 then 'Silver' else 'Bronze' end,
  now() - interval '3 days',
  now() - interval '2 days'
from generate_series(1, 80) g;

insert into public.team_players (team_id, player_id, is_captain, joined_at)
select
  md5('alcl-demo-team-' || ceil(g / 4.0)::integer)::uuid,
  md5('alcl-demo-player-' || g)::uuid,
  ((g - 1) % 4) = 0,
  now() - interval '90 days'
from generate_series(1, 80) g;

insert into public.rosters (id, team_id, tournament_id, submitted_by, locked_at)
select
  md5('alcl-demo-roster-' || g)::uuid,
  md5('alcl-demo-team-' || g)::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  md5('alcl-demo-user-' || (((g - 1) * 4) + 1))::uuid,
  now()
from generate_series(1, 20) g;

insert into public.roster_players (roster_id, player_id, slot, is_substitute)
select
  md5('alcl-demo-roster-' || ceil(g / 4.0)::integer)::uuid,
  md5('alcl-demo-player-' || g)::uuid,
  ((g - 1) % 4) + 1,
  ((g - 1) % 4) = 3
from generate_series(1, 80) g;

insert into public.registrations (
  id, tournament_id, team_id, roster_id, submitted_by, status,
  reviewed_by, reviewed_at
)
select
  md5('alcl-demo-registration-' || g)::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  md5('alcl-demo-team-' || g)::uuid,
  md5('alcl-demo-roster-' || g)::uuid,
  md5('alcl-demo-user-' || (((g - 1) * 4) + 1))::uuid,
  'approved',
  '00000000-0000-0000-0000-000000000001'::uuid,
  now()
from generate_series(1, 20) g;

insert into public.registration_snapshots (
  registration_id, version, snapshot, content_hash, created_by
)
select
  md5('alcl-demo-registration-' || g)::uuid,
  1,
  jsonb_build_object('demo', true, 'team_number', g),
  '',
  md5('alcl-demo-user-' || (((g - 1) * 4) + 1))::uuid
from generate_series(1, 20) g;

insert into public.eligibility_configs (
  id, tournament_id, version, min_age, allowed_country_codes,
  residency_required, config, created_by
) values (
  '32000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  1, 16, array['US'], false,
  '{"demo":true,"account_standing_required":true}'::jsonb,
  '00000000-0000-0000-0000-000000000001'
);

insert into public.rank_snapshots (
  tournament_id, team_id, rank, source, captured_at, snapshot, content_hash
)
select
  '30000000-0000-0000-0000-000000000001'::uuid,
  md5('alcl-demo-team-' || g)::uuid,
  g::text,
  'fictional-demo-ranking',
  now() - interval '1 day',
  jsonb_build_object('demo', true, 'position', g),
  ''
from generate_series(1, 20) g;

insert into public.scoring_configs (
  id, event_id, name, placement_points, points_per_kill, max_matches, created_by
) values (
  '33000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  'Fictional Placement Scoring',
  '{"1":12,"2":9,"3":7,"4":5,"5":4,"6":3,"7":3,"8":2,"9":2,"10":1}'::jsonb,
  1,
  6,
  '00000000-0000-0000-0000-000000000001'
);

insert into public.config_snapshots (
  tournament_id, scoring_config, eligibility_config, rules_config, content_hash, captured_by
) values (
  '30000000-0000-0000-0000-000000000001',
  '{"demo":true,"points_per_kill":1}'::jsonb,
  '{"demo":true,"min_age":16,"allowed_country_codes":["US"]}'::jsonb,
  '{"demo":true,"version":1}'::jsonb,
  '',
  '00000000-0000-0000-0000-000000000001'
);

insert into public.matches (
  id, event_id, scoring_config_id, sequence, lobby_code, starts_at, status
) values (
  '40000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  '33000000-0000-0000-0000-000000000001',
  1,
  'DEMO-ONLY',
  now() - interval '1 day',
  'verified'
);

insert into public.match_teams (match_id, team_id, seed, checked_in_at)
select
  '40000000-0000-0000-0000-000000000001'::uuid,
  md5('alcl-demo-team-' || g)::uuid,
  g,
  now() - interval '1 day'
from generate_series(1, 20) g;

insert into public.match_lineups (id, match_id, team_id, submitted_by, locked_at)
select
  md5('alcl-demo-lineup-' || g)::uuid,
  '40000000-0000-0000-0000-000000000001'::uuid,
  md5('alcl-demo-team-' || g)::uuid,
  md5('alcl-demo-user-' || (((g - 1) * 4) + 1))::uuid,
  now() - interval '1 day'
from generate_series(1, 20) g;

-- Exactly 60 active match players (three per team); the five-observer cap remains unused.
insert into public.match_players (
  match_id, team_id, player_id, match_lineup_id, role, is_substitute, checked_in_at
)
select
  '40000000-0000-0000-0000-000000000001'::uuid,
  md5('alcl-demo-team-' || ceil(g / 3.0)::integer)::uuid,
  md5('alcl-demo-player-' || (((ceil(g / 3.0)::integer - 1) * 4) + ((g - 1) % 3) + 1))::uuid,
  md5('alcl-demo-lineup-' || ceil(g / 3.0)::integer)::uuid,
  'active',
  false,
  now() - interval '1 day'
from generate_series(1, 60) g;

insert into public.match_results (
  match_id, team_id, placement, kills, placement_points, kill_points,
  submitted_by, verified_by, verified_at
)
select
  '40000000-0000-0000-0000-000000000001'::uuid,
  md5('alcl-demo-team-' || g)::uuid,
  g,
  21 - g,
  greatest(13 - g, 0),
  21 - g,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  now() - interval '12 hours'
from generate_series(1, 20) g;

insert into public.event_points (
  event_id, team_id, match_points, kills, wins, placement, finalized_at
)
select
  '31000000-0000-0000-0000-000000000001'::uuid,
  md5('alcl-demo-team-' || g)::uuid,
  greatest(34 - (g * 2), 1),
  21 - g,
  case when g = 1 then 1 else 0 end,
  g,
  now()
from generate_series(1, 20) g;

insert into public.season_standings (
  season_id, team_id, season_points, kills, wins, events_played, rank
)
select
  '20000000-0000-0000-0000-000000000001'::uuid,
  md5('alcl-demo-team-' || g)::uuid,
  (21 - g) * 3,
  21 - g,
  case when g = 1 then 1 else 0 end,
  1,
  g
from generate_series(1, 20) g;

insert into public.championships (
  id, season_id, name, starts_at, ends_at, max_teams, status
) values (
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Fictional ALCL Championship',
  now() + interval '100 days',
  now() + interval '102 days',
  8,
  'scheduled'
);

insert into public.championship_qualification (
  championship_id, team_id, season_rank, qualification_reason, accepted_at
)
select
  '50000000-0000-0000-0000-000000000001'::uuid,
  md5('alcl-demo-team-' || g)::uuid,
  g,
  'Fictional top-eight demo standing',
  now()
from generate_series(1, 8) g;

insert into public.community_supporters (
  id, name, category, website_url, annual_non_cash_value_usd,
  starts_on, ends_on, approved_by
) values
  ('60000000-0000-0000-0000-000000000001',
   'Fictional Learning Collective', 'education', 'https://example.invalid/learning',
   1200, current_date, current_date + 180, '00000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002',
   'Imaginary Hardware Workshop', 'technology', 'https://example.invalid/hardware',
   800, current_date, current_date + 180, '00000000-0000-0000-0000-000000000001');

insert into public.prizes (
  id, tournament_id, team_id, kind, description, cash_value_usd,
  fair_market_value_usd, awarded_at, created_by
) values (
  '61000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  md5('alcl-demo-team-1')::uuid,
  'non_cash',
  'Fictional recognition trophy with no cash alternative',
  0,
  100,
  now(),
  '00000000-0000-0000-0000-000000000001'
);

insert into public.announcements (
  league_id, title, body, status, published_at, created_by
) values (
  '10000000-0000-0000-0000-000000000001',
  'Fictional Demo Season',
  'Local demonstration content only; no real tournament is advertised.',
  'published',
  now(),
  '00000000-0000-0000-0000-000000000001'
);

insert into public.moderation_asset_attestations (
  profile_id, team_id, type, asset_path, statement, accepted, metadata
) values (
  '00000000-0000-0000-0000-000000000001',
  md5('alcl-demo-team-1')::uuid,
  'asset_rights',
  'demo/no-real-art.txt',
  'Demo record: no real artwork is supplied.',
  true,
  '{"demo":true}'::jsonb
);

insert into public.external_data_sources (
  name, type, base_url, public_config, secret_reference, is_active, created_by
) values (
  'Fictional Demo Rank Feed',
  'rank_provider',
  'https://example.invalid/api',
  '{"demo":true}'::jsonb,
  null,
  false,
  '00000000-0000-0000-0000-000000000001'
);

commit;
