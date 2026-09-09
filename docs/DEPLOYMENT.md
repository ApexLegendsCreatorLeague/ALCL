# Deployment runbook

## Before deployment

1. Resolve the production items in `OPEN_QUESTIONS.md`.
2. Review the current policy links in `docs/COMPLIANCE.md`.
3. Keep community mode enabled and commercial authorization disabled.
4. Review all demo content, published rules, supporters, prizes, and uploads.
5. Run `pnpm verify` and `npx supabase db lint`.

## Database

See **`docs/SUPABASE_PRODUCTION.md`** for the full Vercel + Supabase runbook.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Do not run the demo seed against a production project. Create the first trusted
administrator manually and verify that ordinary users cannot update role rows.
Review RLS with separate anonymous, player, manager, organizer, and admin test
accounts.

## Web application

See **`docs/VERCEL.md`** for the full checklist.

Set server-only secrets on Vercel (no `NEXT_PUBLIC_` prefix required):

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`

Set Supabase Auth site URL and `/auth/callback` redirect to match `SITE_URL`.

## Post-deployment smoke test

- Anonymous public pages expose no private registration data.
- Email/password and magic-link login complete through the callback.
- Player, manager, organizer, and admin route boundaries reject wrong roles.
- A cash prize, entry fee, Türkiye event, prohibited supporter, paid broadcast,
  or registration without published rules is rejected server-side.
- Result entry creates audit records and deterministic standings.
- Footer and tournament materials show the required disclaimer.
- Desktop, tablet, mobile, and 1920x1080 browser-source layouts render correctly.
