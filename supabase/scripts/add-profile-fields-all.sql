-- Run once in Supabase Dashboard → SQL Editor.
-- Adds every profile column the site reads/writes for public player pages.
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS).

-- Social links
alter table public.profiles
  add column if not exists youtube_url text,
  add column if not exists x_url text,
  add column if not exists tiktok_url text,
  add column if not exists instagram_url text,
  add column if not exists twitch_url text,
  add column if not exists kick_url text;

alter table public.profiles
  drop constraint if exists profiles_youtube_url_check,
  drop constraint if exists profiles_x_url_check,
  drop constraint if exists profiles_tiktok_url_check,
  drop constraint if exists profiles_instagram_url_check,
  drop constraint if exists profiles_twitch_url_check,
  drop constraint if exists profiles_kick_url_check;

alter table public.profiles
  add constraint profiles_youtube_url_check
    check (youtube_url is null or youtube_url ~ '^https?://'),
  add constraint profiles_x_url_check
    check (x_url is null or x_url ~ '^https?://'),
  add constraint profiles_tiktok_url_check
    check (tiktok_url is null or tiktok_url ~ '^https?://'),
  add constraint profiles_instagram_url_check
    check (instagram_url is null or instagram_url ~ '^https?://'),
  add constraint profiles_twitch_url_check
    check (twitch_url is null or twitch_url ~ '^https?://'),
  add constraint profiles_kick_url_check
    check (kick_url is null or kick_url ~ '^https?://');

-- Recruitment
alter table public.profiles
  add column if not exists looking_for_team boolean not null default false,
  add column if not exists preferred_roles text,
  add column if not exists availability text,
  add column if not exists recruitment_pitch text;

alter table public.profiles
  drop constraint if exists profiles_preferred_roles_check,
  drop constraint if exists profiles_availability_check,
  drop constraint if exists profiles_recruitment_pitch_check;

alter table public.profiles
  add constraint profiles_preferred_roles_check
    check (preferred_roles is null or char_length(preferred_roles) <= 120),
  add constraint profiles_availability_check
    check (availability is null or char_length(availability) <= 250),
  add constraint profiles_recruitment_pitch_check
    check (recruitment_pitch is null or char_length(recruitment_pitch) <= 800);

-- Top 3 legends
alter table public.profiles
  add column if not exists main_legend_1 text,
  add column if not exists main_legend_2 text,
  add column if not exists main_legend_3 text;

alter table public.profiles
  drop constraint if exists profiles_main_legend_1_check,
  drop constraint if exists profiles_main_legend_2_check,
  drop constraint if exists profiles_main_legend_3_check;

alter table public.profiles
  add constraint profiles_main_legend_1_check
    check (main_legend_1 is null or char_length(main_legend_1) <= 40),
  add constraint profiles_main_legend_2_check
    check (main_legend_2 is null or char_length(main_legend_2) <= 40),
  add constraint profiles_main_legend_3_check
    check (main_legend_3 is null or char_length(main_legend_3) <= 40);

-- Verify: all columns should be true
select
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'youtube_url') as has_youtube_url,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'looking_for_team') as has_looking_for_team,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'recruitment_pitch') as has_recruitment_pitch,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'main_legend_1') as has_main_legend_1,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'main_legend_2') as has_main_legend_2,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'main_legend_3') as has_main_legend_3;
