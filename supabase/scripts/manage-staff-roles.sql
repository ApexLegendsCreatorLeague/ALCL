-- ALCL staff roles (run in Supabase Dashboard → SQL Editor)
--
-- ALCL does not use a separate "owner" role name. Use:
--   admin      → platform administrator (full /admin access, can manage roles)
--   organizer  → league / organization owner (runs events, same /admin access)
--
-- Players always keep the player role. Staff roles are added in profile_roles.
-- Run each block separately. Replace the example email before running.

-- ---------------------------------------------------------------------------
-- 1) List accounts and current roles
-- ---------------------------------------------------------------------------
select
  u.id as profile_id,
  u.email,
  p.display_name,
  coalesce(array_agg(pr.role order by pr.role) filter (where pr.role is not null), '{}') as roles,
  u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
left join public.profile_roles pr on pr.profile_id = u.id
group by u.id, u.email, p.display_name, u.created_at
order by u.created_at desc;

-- ---------------------------------------------------------------------------
-- 2) Grant ADMIN (platform administrator)
-- Replace player@example.com with the account email.
-- ---------------------------------------------------------------------------
insert into public.profile_roles (profile_id, role, granted_by)
select u.id, 'admin'::public.app_role, u.id
from auth.users u
where lower(u.email) = lower('player@example.com')
on conflict (profile_id, role) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Grant OWNER access (organizer role - league / org owner)
-- Replace owner@example.com with the account email.
-- ---------------------------------------------------------------------------
insert into public.profile_roles (profile_id, role, granted_by)
select u.id, 'organizer'::public.app_role, u.id
from auth.users u
where lower(u.email) = lower('owner@example.com')
on conflict (profile_id, role) do nothing;

-- ---------------------------------------------------------------------------
-- 4) Grant BOTH admin + organizer to one person (founder account)
-- ---------------------------------------------------------------------------
insert into public.profile_roles (profile_id, role, granted_by)
select u.id, role_name, u.id
from auth.users u
cross join (values ('admin'::public.app_role), ('organizer'::public.app_role)) as roles(role_name)
where lower(u.email) = lower('founder@example.com')
on conflict (profile_id, role) do nothing;

-- ---------------------------------------------------------------------------
-- 5) Remove staff access (keeps their player account)
-- ---------------------------------------------------------------------------
delete from public.profile_roles pr
using auth.users u
where pr.profile_id = u.id
  and lower(u.email) = lower('former-admin@example.com')
  and pr.role in ('admin', 'organizer', 'moderator', 'scorer');

-- ---------------------------------------------------------------------------
-- 6) Verify one account after changes
-- ---------------------------------------------------------------------------
select u.email, pr.role, pr.granted_at
from auth.users u
join public.profile_roles pr on pr.profile_id = u.id
where lower(u.email) = lower('founder@example.com')
order by pr.role;

-- After granting roles: sign out on the site, sign back in, then open /admin
