-- Run once in the Supabase SQL editor (or via psql) after creating your first
-- auth user in Authentication > Users. Replace the placeholder UUID below.
--
-- 1. Supabase Dashboard > Authentication > Users > Add user (email + password)
-- 2. Copy the user's UUID from the users table
-- 3. Replace YOUR_USER_UUID and run this script

insert into public.profile_roles (profile_id, role, granted_by)
values
  ('YOUR_USER_UUID'::uuid, 'organizer', 'YOUR_USER_UUID'::uuid),
  ('YOUR_USER_UUID'::uuid, 'admin', 'YOUR_USER_UUID'::uuid)
on conflict (profile_id, role) do nothing;

-- Verify: this user should now access /admin after signing in on the live site.
