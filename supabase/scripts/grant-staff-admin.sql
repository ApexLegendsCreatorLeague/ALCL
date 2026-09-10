-- Grant ALCL staff access (Supabase Dashboard → SQL Editor)
--
-- Role mapping (shows on profiles table after add-profile-role-flags.sql):
--   admin role      → is_admin = true
--   organizer role  → is_owner = true  (Owner - ALL rights)
--   player role     → is_player = true (everyone)
--
-- Run block 1 → block 2 → block 3
-- Then sign out / sign in on the site and open /admin

-- ---------------------------------------------------------------------------
-- 1) Find the account
-- ---------------------------------------------------------------------------
select
  u.id as profile_id,
  u.email,
  p.display_name,
  p.is_player,
  p.is_admin,
  p.is_owner
from auth.users u
join public.profiles p on p.id = u.id
where lower(p.display_name) = lower('KushyKush');

-- ---------------------------------------------------------------------------
-- 2) Grant admin + owner (organizer) to KushyKush
--    Change 'KushyKush' when granting your partner's account
-- ---------------------------------------------------------------------------
insert into public.profile_roles (profile_id, role, granted_by)
select u.id, role_name, u.id
from auth.users u
join public.profiles p on p.id = u.id
cross join (values ('admin'::public.app_role), ('organizer'::public.app_role)) as roles(role_name)
where lower(p.display_name) = lower('KushyKush')
on conflict (profile_id, role) do nothing
returning profile_id, role, granted_at;

-- ---------------------------------------------------------------------------
-- 3) Verify - profiles table flags (and underlying roles)
-- ---------------------------------------------------------------------------
select
  p.display_name,
  u.email,
  p.is_player,
  p.is_admin,
  p.is_owner,
  array_agg(pr.role order by pr.role) as profile_roles
from public.profiles p
join auth.users u on u.id = p.id
left join public.profile_roles pr on pr.profile_id = p.id
where lower(p.display_name) = lower('KushyKush')
group by p.display_name, u.email, p.is_player, p.is_admin, p.is_owner;
