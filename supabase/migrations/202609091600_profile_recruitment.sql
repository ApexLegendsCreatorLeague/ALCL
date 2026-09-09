-- Player-written recruitment info for team captains scouting free agents.

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

comment on column public.profiles.looking_for_team is 'Player is actively open to team offers.';
comment on column public.profiles.preferred_roles is 'Comma-separated Apex legend classes: Assault, Skirmisher, Recon, Support, Controller.';
comment on column public.profiles.availability is 'When the player can scrim and compete.';
comment on column public.profiles.recruitment_pitch is 'Free-form pitch for captains evaluating this player.';
