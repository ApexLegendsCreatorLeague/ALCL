# ALCL architecture

## Trust boundaries

1. Browser components handle presentation and draft UX only.
2. Server actions and route handlers authenticate the user, validate Zod input,
   apply role/policy checks, and call repositories.
3. PostgreSQL constraints, RLS, and security-definer functions enforce the same
   critical invariants at the data boundary.
4. Raw match results and immutable configuration snapshots are authoritative.
   Standings are deterministic projections that can be recalculated.
5. The service-role key is restricted to server-only administrative processes.

## Competition model

```text
League
  -> Season
    -> Event (schedule and season-points container)
      -> Tournament (operational settings and frozen rules/scoring snapshots)
        -> Match
          -> Raw team/player results
            -> Match points
              -> Event standings and event points
                -> Season standings
                  -> Championship qualification
```

Registered rosters and match lineups are separate. A roster has three starters
and up to two substitutes; a match lineup has exactly three players. Rank and
eligibility are snapshotted when a registration is submitted.

## Historical integrity

Published rules and scoring/eligibility/event-points configurations are
versioned. Closing registration or completing an event freezes references to
the relevant versions. Future configuration changes do not rewrite completed
results. Recalculation records actor, reason, inputs, and resulting version in
the audit log.

## Data access

- Anonymous: published public views only.
- Player: own private profile and registration participation.
- Team manager: own team, unlocked roster drafts, and registrations.
- Organizer: league-scoped event operations and result workflows.
- Admin: trusted platform administration, still subject to compliance guards.

Contact information and guardian/eligibility evidence never appear in public
views. Public search indexes only explicitly publishable team, player, and
tournament fields.

## Integrations

Manual organizer entry is the sole enabled result/rank source. Future adapters
must declare authorization, allowed fields, retention, and rate limits before
activation. The interface cannot receive EA passwords, tokens, or private API
credentials. Discord is an optional future consumer of public ALCL data.
