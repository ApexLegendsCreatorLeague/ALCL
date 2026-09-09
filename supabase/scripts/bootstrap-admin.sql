-- Bootstrap the first ALCL administrator (Supabase SQL Editor)
--
-- Option A — by email (easiest after the player has registered):
--   1. Replace the email below
--   2. Run this script
--
-- Option B — by UUID:
--   Authentication → Users → copy UUID → replace in the profile_id filter

-- Grant platform admin + organizer (owner) to one account:
insert into public.profile_roles (profile_id, role, granted_by)
select u.id, role_name, u.id
from auth.users u
cross join (values ('admin'::public.app_role), ('organizer'::public.app_role)) as roles(role_name)
where lower(u.email) = lower('YOUR_EMAIL@example.com')
on conflict (profile_id, role) do nothing;

-- Verify:
select u.email, pr.role
from auth.users u
join public.profile_roles pr on pr.profile_id = u.id
where lower(u.email) = lower('YOUR_EMAIL@example.com')
order by pr.role;

-- Sign out and back in on the live site, then visit /admin
