-- Streamer and creator social links on public player profiles.

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

comment on column public.profiles.youtube_url is 'Public YouTube channel URL for this player.';
comment on column public.profiles.x_url is 'Public X (Twitter) profile URL for this player.';
comment on column public.profiles.tiktok_url is 'Public TikTok profile URL for this player.';
comment on column public.profiles.instagram_url is 'Public Instagram profile URL for this player.';
comment on column public.profiles.twitch_url is 'Public Twitch channel URL for this player.';
comment on column public.profiles.kick_url is 'Public Kick channel URL for this player.';
