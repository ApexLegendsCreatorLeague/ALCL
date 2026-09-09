-- ALCL reset for hosted Supabase (run in SQL Editor, confirm destructive warning)
-- No transaction wrapper — Supabase rejects some DDL inside BEGIN/COMMIT.
-- After this: npx supabase link && npx supabase db push

-- 1) Auth trigger from ALCL migrations
drop trigger if exists on_auth_user_created on auth.users;

-- 2) Storage policies from ALCL (ignore if part1 never ran)
drop policy if exists "public media readable" on storage.objects;
drop policy if exists "users upload own avatars" on storage.objects;
drop policy if exists "users update own avatars" on storage.objects;
drop policy if exists "captains manage team logos" on storage.objects;
drop policy if exists "authorized evidence read" on storage.objects;
drop policy if exists "authorized evidence upload" on storage.objects;

-- 3) Clear CLI migration history so "db push" runs all migrations again
do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    delete from supabase_migrations.schema_migrations;
  end if;
end $$;

-- 4) Wipe public schema (standard Supabase reset pattern)
drop schema if exists public cascade;

create schema public;

grant all on schema public to postgres;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to service_role;

alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;

-- Done. Table Editor should show no public tables.
-- Optional: Authentication > Users > delete all users.
