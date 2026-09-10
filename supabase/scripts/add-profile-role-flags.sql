-- Run once in Supabase Dashboard → SQL Editor
-- Adds is_player / is_admin / is_owner columns to public.profiles
-- and keeps them synced from profile_roles.
--
-- After running: open Table Editor → profiles
-- You will see:
--   is_player  = competition participant (teams, dashboard)
--   is_admin   = platform admin
--   is_owner   = site/league owner (ALL rights - maps to organizer role)

alter table public.profiles
  add column if not exists is_player boolean not null default true,
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_owner boolean not null default false;

comment on column public.profiles.is_player is 'Synced from profile_roles.player';
comment on column public.profiles.is_admin is 'Synced from profile_roles.admin';
comment on column public.profiles.is_owner is 'Synced from profile_roles.organizer (Owner)';

create or replace function public.sync_profile_role_flags(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
  set
    is_player = exists (
      select 1
      from public.profile_roles pr
      where pr.profile_id = target_profile_id
        and pr.role = 'player'
        and (pr.expires_at is null or pr.expires_at > now())
    ),
    is_admin = exists (
      select 1
      from public.profile_roles pr
      where pr.profile_id = target_profile_id
        and pr.role = 'admin'
        and (pr.expires_at is null or pr.expires_at > now())
    ),
    is_owner = exists (
      select 1
      from public.profile_roles pr
      where pr.profile_id = target_profile_id
        and pr.role = 'organizer'
        and (pr.expires_at is null or pr.expires_at > now())
    )
  where p.id = target_profile_id;
end;
$$;

create or replace function public.sync_profile_role_flags_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_profile_role_flags(coalesce(new.profile_id, old.profile_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists profile_roles_sync_profile_flags on public.profile_roles;

create trigger profile_roles_sync_profile_flags
after insert or update or delete on public.profile_roles
for each row execute function public.sync_profile_role_flags_trigger();

do $$
declare
  profile_row record;
begin
  for profile_row in select id from public.profiles loop
    perform public.sync_profile_role_flags(profile_row.id);
  end loop;
end;
$$;

-- Quick check
select display_name, is_player, is_admin, is_owner
from public.profiles
order by created_at desc;
