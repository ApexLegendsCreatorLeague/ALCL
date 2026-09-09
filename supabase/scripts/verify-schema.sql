-- Quick check: run in Supabase SQL Editor. All should return true / row counts.

select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') as has_profiles;
select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'tournaments') as has_tournaments;
select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'match_lineups') as has_match_lineups;
select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'liveapi_sessions') as has_liveapi;
select count(*) as app_roles_count from public.app_roles;
select count(*) as compliance_rows from public.compliance_settings;
