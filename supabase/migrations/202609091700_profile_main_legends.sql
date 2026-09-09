-- Top 3 main legends for roster planning (avoid duplicate picks).

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
