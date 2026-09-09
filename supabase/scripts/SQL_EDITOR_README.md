# Supabase SQL Editor — ALCL install (3-part)

Do **not** run `seed.sql` on production.

## Step 0 — Reset (start over)

If tables already exist or a prior install failed partway:

1. Open `00-teardown.sql`
2. Paste into SQL Editor → **Run** (confirm destructive warning)
3. Optional: **Authentication → Users** → delete all users for a fully clean slate

## Step 1 — Install (run each file separately)

Run **one file per query**. Wait for success before the next.

| Order | File | ~Lines |
|-------|------|--------|
| 1 | `part1-foundation.sql` | 1073 |
| 2 | `part2-hardening.sql` | 521 |
| 3 | `part3-liveapi.sql` | 204 |

Copy the **entire** file each time (Ctrl+A, Ctrl+C). If you see
`syntax error at end of input`, the paste was truncated — paste again or use a
smaller file.

## Step 2 — Verify

Run `verify-schema.sql`. Expect:

- `has_profiles`, `has_tournaments`, `has_match_lineups`, `has_liveapi` → `true`
- `app_roles_count` → `6`
- `compliance_rows` → `1`

## Step 3 — Staff roles (admin / owner)

After a player registers on the site (or you add them under **Authentication → Users**):

1. Open **`manage-staff-roles.sql`** in this folder
2. Run block **1** to list accounts and current roles
3. Run block **2**, **3**, or **4** with the target email:
   - **`admin`** — platform administrator
   - **`organizer`** — league / organization owner (ALCL “owner” access)
4. User must **sign out and sign back in**, then open **`/admin`**

Quick first-time setup: edit email in **`bootstrap-admin.sql`** and run it (grants both admin + organizer).

## Step 4 — Auth URLs and password reset email

In Supabase **Authentication → URL Configuration**:

- **Site URL:** `https://thessiatournamentsite.com`
- **Redirect URLs** (add each line):
  - `https://thessiatournamentsite.com/auth/callback`
  - `https://thessiatournamentsite.com/auth/recovery`
  - `https://thessiatournamentsite.com/auth/confirm`

In **Authentication → Email Templates → Reset password**, replace the body with:

```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your ALCL player account:</p>
<p><a href="{{ .SiteURL }}/auth/recovery?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>
```

This avoids PKCE expiry issues and works when the email is opened on a different device than the browser that requested the reset.

## Step 5 — Vercel

Set env vars from Supabase **Settings → API**, redeploy, and set `SITE_URL=https://thessiatournamentsite.com`.
