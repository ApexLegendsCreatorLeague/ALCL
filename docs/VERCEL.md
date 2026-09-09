# Vercel production checklist

## 1. Database (Supabase)

```powershell
npx supabase login
npx supabase link --project-ref dfplohhclsnhkwaaujxh
npx supabase db push
```

Reset first (SQL Editor): `supabase/scripts/00-teardown.sql`

First admin: create user in Supabase Auth, then run `supabase/scripts/bootstrap-admin.sql`.

## 2. Vercel environment variables (all Secrets — no NEXT_PUBLIC_ required)

| Name | Example / source |
|------|------------------|
| `SUPABASE_URL` | `https://dfplohhclsnhkwaaujxh.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `SITE_URL` | `https://your-app.vercel.app` |
| `COMMUNITY_TOURNAMENT_MODE` | `true` |
| `COMMERCIAL_AUTHORIZATION_ENABLED` | `false` |

Remove old `NEXT_PUBLIC_*` vars if present (optional fallbacks only).

## 3. Supabase Auth URLs

**Authentication → URL Configuration**

- Site URL: same as `SITE_URL`
- Redirect: `https://your-app.vercel.app/auth/callback`

## 4. Deploy

Push to GitHub → Vercel auto-deploys, or **Deployments → Redeploy** after env changes.

Node.js **22+** (set in `package.json` engines).

## 5. Smoke test

- [ ] `/login` — sign in with Supabase user (not demo error)
- [ ] `/admin` — works for bootstrap admin user
- [ ] Public pages load; no secrets in page source
- [ ] Magic link lands on `/auth/callback` then `/dashboard`

## Known limitations (v1)

Public tournament/standings pages still show **demo content** until wired to
live Supabase queries. Auth, admin shell, registration API, and RLS are live
when env vars + migrations are in place.
