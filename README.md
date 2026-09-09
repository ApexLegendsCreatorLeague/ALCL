# ALCL

ALCL is an independent community tournament platform for competitions played in
Apex Legends. It is not affiliated with, sponsored by, endorsed by, or approved
by Electronic Arts Inc., Respawn Entertainment, or ALGS.

The product includes public tournaments and standings, team/player profiles, a
mobile registration workflow, organizer administration, deterministic scoring,
season qualification, browser-source broadcast views, Supabase Auth, PostgreSQL
RLS, audit logs, and community-tournament compliance controls.

This repository does not provide legal advice. Organizers must publish reviewed
event rules and confirm local legal requirements before opening registration.

## Stack

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4
- Supabase Auth, PostgreSQL, Row Level Security, and Storage
- Zod and React Hook Form
- Vitest and Playwright

## Local setup

Requirements: Node.js 22+, Docker Desktop for local Supabase, and the Supabase
CLI (the commands below use `npx`, so a global installation is optional).

```powershell
Copy-Item .env.example .env.local
npx supabase start
npx supabase db reset
npx --yes pnpm@10.34.5 dev
```

Copy the local API URL, publishable/anon key, and service-role key printed by
`supabase start` into `.env.local`. The service-role key is server-only.

Open `http://localhost:3000`. Seeded records are fictional and visibly marked as
demo data. Without Supabase environment values, public demo pages still render,
while authenticated mutations remain unavailable.

## Commands

```powershell
npx --yes pnpm@10.34.5 dev
npx --yes pnpm@10.34.5 typecheck
npx --yes pnpm@10.34.5 lint
npx --yes pnpm@10.34.5 test
npx --yes pnpm@10.34.5 test:e2e
npx --yes pnpm@10.34.5 build
npx --yes pnpm@10.34.5 collector:liveapi
npx supabase db lint
npx supabase db reset
```

## Supabase deployment

1. Create a Supabase project and link it with `npx supabase link`.
2. Apply migrations with `npx supabase db push`.
3. Run `supabase/seed.sql` only in development or an intentional demo project.
4. Set Vercel secrets from `.env.example` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`). See `docs/VERCEL.md`.
5. Configure Supabase Auth site URL and `/auth/callback` redirect.
6. Create the first admin through the Supabase dashboard, then assign its
   `app_role` using a trusted SQL/admin process. Users cannot elevate themselves.

## Application deployment

The app can be deployed to Vercel or another Node-compatible host:

```powershell
npx --yes pnpm@10.34.5 build
```

Set the variables from `.env.example`, use Node.js 22 or newer, and deploy the
generated Next.js application. Keep community mode enabled unless separate
written authorization and legal review have been documented.

## Compliance operations

- ALCL is the brand. “Independent community tournaments for Apex Legends” is
  descriptive copy, not an affiliation claim.
- Cash prizes and entry fees are disabled in community mode.
- Non-cash awards need a good-faith cash-value estimate and calendar-year cap.
- Supporters require category, content, and rights review before publication.
- Event rules must be published before registration opens or play begins.
- Tournaments cannot be operated in the Republic of Türkiye under the currently
  reviewed guidelines.
- Distribution is limited to public streaming platforms; no TV or paid access.
- Match results may be drafted from the read-only Apex LiveAPI collector but
  require an organizer to review team bindings and verify publication.
- Do not upload EA, Respawn, ALGS, or game artwork/logos.

Policy links and the review date live in
`src/config/community-tournament.ts`. Review them before every event and after
any EA policy change. See `OPEN_QUESTIONS.md` for decisions requiring organizer
or qualified legal input.

## Automatic Apex LiveAPI results

The observer-PC collector listens only on localhost, never sends commands back
to Apex, signs each upload, archives raw events locally, and retries temporary
network failures. ALCL retains raw and normalized events for audit. Draft team
results contain placement and kills; player drafts also retain kills, assists,
damage, and knocks when those counters are emitted by the installed LiveAPI
version.

LiveAPI is available only for supported Apex custom matches. Its schema can
change between game releases. Kill credit is taken from `PlayerStatChanged`,
not inferred from `PlayerKilled`, because current LiveAPI versions do not
reliably attribute every death event to the credited player.

1. Apply `supabase/migrations/202609060003_liveapi_ingestion.sql`.
2. Set `LIVEAPI_INGEST_SECRET` (32+ random characters) and
   `LIVEAPI_SOURCE_KEYS=observer-pc` in the deployed ALCL server.
3. Create the scheduled match, scoring configuration, and match-team entries.
4. On the observer PC, set the collector variables:

```powershell
$env:ALCL_INGEST_URL="https://your-alcl-site.example/api/liveapi/events"
$env:ALCL_LIVEAPI_SECRET="<same secret as the server>"
$env:ALCL_LIVEAPI_SOURCE="observer-pc"
$env:ALCL_MATCH_ID="<scheduled ALCL match UUID>"
npx --yes pnpm@10.34.5 collector:liveapi
```

5. Add these Apex launch options on that same observer PC:

```text
+cl_liveapi_enabled 1 +cl_liveapi_use_protobuf 0 +cl_liveapi_allow_requests 0 +cl_liveapi_ws_servers "ws://127.0.0.1:7777"
```

6. Open `/admin/live-data`, bind each observed LiveAPI team to its registered
   ALCL team, and verify the generated draft after the match. Standings update
   only after verification.

The first collector release intentionally consumes LiveAPI JSON. This avoids
silently decoding data with stale generated protobuf bindings; compare behavior
with the `events.proto` installed with Apex after game updates.

Authorized third-party feeds can be added with
`createAuthorizedProviderAdapter`. Activating one requires an authorization
reference and organizer approval in `external_data_sources`; provider secrets
remain server-only.
