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

## Step 3 — Profile role columns (run once)

Run **`add-profile-role-flags.sql`** in the SQL Editor.

After that, **Table Editor → profiles** shows:

| Column | Meaning |
|--------|---------|
| `is_player` | Player rights (teams, dashboard) |
| `is_admin` | Admin rights |
| `is_owner` | Owner rights — ALL access (backed by `organizer` role) |

These stay in sync automatically when `profile_roles` changes.

## Step 3b — Profile social links (run once)

Run **`add-profile-socials.sql`** in the SQL Editor.

Adds to **Table Editor → profiles**:

| Column | Platform |
|--------|----------|
| `youtube_url` | YouTube |
| `x_url` | X (Twitter) |
| `tiktok_url` | TikTok |
| `instagram_url` | Instagram |
| `twitch_url` | Twitch |
| `kick_url` | Kick |

The verify query at the bottom should return all six `has_*` columns as `true`.

## Step 3c — Profile recruitment fields (run once)

Run **`add-profile-recruitment.sql`** in the SQL Editor.

Adds captain-facing recruitment fields to **profiles**:

| Column | Purpose |
|--------|---------|
| `looking_for_team` | Player is open to offers |
| `availability` | Scrim / match schedule |
| `recruitment_pitch` | Free-form pitch to captains |

## Step 3d — Top 3 main legends (run once)

Run **`add-profile-main-legends.sql`** in the SQL Editor.

Adds to **profiles**:

| Column | Purpose |
|--------|---------|
| `main_legend_1` | Most-played legend |
| `main_legend_2` | Second main |
| `main_legend_3` | Third main |

## Step 4 — Staff roles (admin / owner)

After a player registers on the site:

1. Run **`add-profile-role-flags.sql`** if you have not already
2. Open **`grant-staff-admin.sql`**
3. Run blocks **1 → 2 → 3** (default account name: `KushyKush`)
4. User must **sign out and sign back in**, then open **`/admin`**

For email-based lookup instead, use **`bootstrap-admin.sql`** or **`manage-staff-roles.sql`**.

## Step 5 — Password reset email (required once)

The default Supabase reset email uses a PKCE link that often fails with `otp_expired`.
ALCL uses a direct `token_hash` link instead (`supabase/templates/recovery.html`).

**Option A — script (fastest):**

1. Create a token at https://supabase.com/dashboard/account/tokens
2. Run:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "your-token"
npm run supabase:push-recovery-template
```

**Option B — Dashboard:**

1. **Authentication → URL Configuration**
   - Site URL: `https://thessiatournamentsite.com`
   - Redirect URLs: add `/auth/recovery`, `/auth/callback`, `/auth/confirm`
2. **Authentication → Email Templates → Reset password**
   - Copy the contents of `supabase/templates/recovery.html`

## Step 6 — Vercel

Set env vars from Supabase **Settings → API**, redeploy, and set `SITE_URL=https://thessiatournamentsite.com`.
