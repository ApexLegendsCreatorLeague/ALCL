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

## Step 3 — First admin

1. **Authentication → Users → Add user**
2. Copy UUID → run `bootstrap-admin.sql` (replace `YOUR_USER_UUID`)

## Step 4 — Vercel

Set env vars from Supabase **Settings → API**, redeploy, configure Auth redirect URLs.
