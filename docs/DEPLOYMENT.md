# Deployment runbook

## Before deployment

1. Resolve the production items in `OPEN_QUESTIONS.md`.
2. Review the current policy links in `docs/COMPLIANCE.md`.
3. Keep community mode enabled and commercial authorization disabled.
4. Review all demo content, published rules, supporters, prizes, and uploads.
5. Run `pnpm verify` and `npx supabase db lint`.

## Database

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

Configure the variables documented in `.env.example`. Deploy to a
Node-compatible Next.js host. For Vercel:

```powershell
npx vercel
npx vercel --prod
```

Set the production URL in Supabase Authentication URL Configuration, including
the `/auth/callback` redirect. The service-role key must never use a
`NEXT_PUBLIC_` prefix.

## Post-deployment smoke test

- Anonymous public pages expose no private registration data.
- Email/password and magic-link login complete through the callback.
- Player, manager, organizer, and admin route boundaries reject wrong roles.
- A cash prize, entry fee, Türkiye event, prohibited supporter, paid broadcast,
  or registration without published rules is rejected server-side.
- Result entry creates audit records and deterministic standings.
- Footer and tournament materials show the required disclaimer.
- Desktop, tablet, mobile, and 1920x1080 browser-source layouts render correctly.
