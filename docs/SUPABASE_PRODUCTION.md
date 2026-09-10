# Supabase production setup (Vercel)

Use this runbook after the Next.js app is deployed to Vercel. The site stays in
public demo mode until Supabase environment variables are set and migrations are
applied.

## 1. Create a Supabase project

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and create a
   project named **ALCL** (dedicated project; do not reuse unrelated apps).
2. Save the **database password** - you cannot recover it later.
3. Pick a region close to your players (for example `us-west-1`).

Or via CLI (replace placeholders):

```powershell
npx supabase login
npx supabase projects create ALCL `
  --org-id YOUR_ORG_ID `
  --db-password "YOUR_STRONG_DB_PASSWORD" `
  --region us-west-1
```

## 2. Link the repo and apply migrations

From the ALCL repo root:

```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

This applies all files in `supabase/migrations/`. **Do not** run
`supabase/seed.sql` on production - it is fictional demo data only.

Optional lint before push:

```powershell
npx supabase db lint
```

## 3. Copy API keys

Dashboard: **Project Settings → API**

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **anon** / **publishable** key |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key (server-only) |

CLI:

```powershell
npx supabase projects api-keys --project-ref YOUR_PROJECT_REF --reveal --output json
```

## 4. Configure Vercel environment variables

In the Vercel project: **Settings → Environment Variables** (Production):

| Name | Value | Notes |
|------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | anon/publishable key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **Never** prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | Auth redirects |
| `COMMUNITY_TOURNAMENT_MODE` | `true` | Keep enabled for community events |
| `COMMERCIAL_AUTHORIZATION_ENABLED` | `false` | Keep disabled unless legally cleared |
| `LIVEAPI_INGEST_SECRET` | random 32+ chars | Defer until LiveAPI pilot |
| `LIVEAPI_SOURCE_KEYS` | `observer-pc` | Defer until LiveAPI pilot |

Then **Redeploy** production (Deployments → … → Redeploy).

CLI (after `npx vercel login` and linking the project):

```powershell
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add NEXT_PUBLIC_SITE_URL production
```

## 5. Supabase Auth URL configuration

Dashboard: **Authentication → URL Configuration**

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs** (add both):
  - `https://your-app.vercel.app/auth/callback`
  - `https://your-app.vercel.app/**` (wildcard optional; callback is required)

Email templates can stay default for magic links. Confirmations are enabled
in migrations; new users may need email confirmation unless you disable it in
Auth settings for early testing.

## 6. Bootstrap the first organizer / admin

Create the first account **on your site** - not in the Supabase dashboard:

1. Open `https://your-app.vercel.app/login`.
2. Use **Create account** (display name, email, password).
3. If email confirmation is enabled in Supabase Auth, confirm the email, then sign in.
4. The first registered user automatically receives organizer + admin roles
   (requires `SUPABASE_SERVICE_ROLE_KEY` on Vercel).

Open `/admin` after sign-in.

Fallback only if sign-up fails: `supabase/scripts/bootstrap-admin.sql` in SQL Editor.

## 7. Smoke test

- Public pages load without exposing private registration data.
- Login and magic link complete via `/auth/callback`.
- `/dashboard` requires auth; `/admin` requires organizer or admin role.
- Registration API rejects compliance violations (cash prizes, TR events, etc.).
- Footer shows the required EA non-affiliation disclaimer.

## 8. What changes when Supabase is connected

- `isSupabaseConfigured()` becomes true - auth gates and API routes use the database.
- Public tournament/standings pages may still show demo content until wired to
  live queries; create leagues/tournaments via admin or SQL for real events.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login redirects to error | Check Site URL + `/auth/callback` redirect in Supabase Auth |
| "Supabase is not configured" locally | Copy keys to `.env.local` from `.env.example` |
| Admin 403 after login | Run bootstrap-admin SQL for your user UUID |
| Migrations fail on push | Run `npx supabase db lint`; fix SQL; retry `db push` |
| Build works but auth fails on Vercel | Redeploy after adding env vars; confirm Production scope |
