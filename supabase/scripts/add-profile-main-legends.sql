-- Run once in Supabase SQL Editor.
-- Adds top-3 main legend columns so captains can avoid duplicate legend picks.

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

comment on column public.profiles.main_legend_1 is 'Primary main legend for team recruitment.';
comment on column public.profiles.main_legend_2 is 'Secondary main legend for team recruitment.';
comment on column public.profiles.main_legend_3 is 'Third main legend for team recruitment.';

select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'main_legend_1'
  ) as has_main_legend_1,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'main_legend_2'
  ) as has_main_legend_2,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'main_legend_3'
  ) as has_main_legend_3;
