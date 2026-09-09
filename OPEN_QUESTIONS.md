# ALCL open decisions

The backend uses conservative community-mode defaults. These items require an
organizer decision, qualified legal/privacy advice, or written rights-holder
clarification before a real event opens. They are not legal advice.

## Legal and territory

- What legal entity and jurisdiction operates ALCL, and what production
  contact details must appear in legal and privacy notices?
- Can residents of Türkiye participate in an event operated elsewhere?
  Operation of a tournament in Türkiye is currently blocked in SQL.
- Which other countries or states require permits, registrations, tax
  reporting, consumer disclosures, or local exclusions?
- What minimum participant age applies per territory, and what guardian
  consent evidence and retention period are required?
- Does the planned recurring five-event season remain within every relevant
  community-tournament or rights-holder threshold? Larger or commercial
  executions need separate review and any required written authorization.

## Prize and supporter compliance

- Is the USD 10,000 cap measured by calendar year, rolling 12 months, operator,
  legal entity, or program? SQL currently applies a combined calendar-year cap
  to non-cash supporter value and prize fair-market value.
- What good-faith valuation method, exchange-rate source, valuation date, tax,
  delivery cost, and documentation standard apply to non-cash benefits?
- Are travel, services, discounts, trophies, or supporter-provided benefits
  cash equivalents? Community mode currently rejects cash prizes and all entry
  fees.
- Is the prohibited supporter-category list complete, especially for financial
  products, loot boxes, age-restricted goods, political groups, and adjacent
  gaming products?
- Must supporter-name screening extend beyond tournament titles to event,
  league, team, broadcast, venue, or award names?
- Who performs supporter due diligence, how often is it renewed, and what
  evidence and appeal process are required?

## Competition rules and eligibility

- Finalize region, platform, account-standing, rank, roster-lock, substitute,
  disconnect, cheating, collusion, dispute, appeal, and penalty rules.
- Confirm the current private-match limits of 60 active players and 5 observers
  per lobby before each event. Registered substitutes remain outside the active
  match lineup unless formally substituted.
- Define roster minimums, transfer windows, emergency substitutions, and
  whether a player may represent multiple teams or leagues.
- What is the authoritative ranking source and evidence? Does eligibility lock
  at registration, and can later rank changes be grandfathered?
- May published rules change after registration opens? Define versioning,
  participant notice, re-consent, and cancellation rights.
- Define scoring, tiebreak, result certification/reopening, forfeits, and
  championship qualification/replacement rules.
- What registration-capacity and waitlist behavior is required under concurrent
  submissions?

## Privacy, security, and moderation

- Identify the data controller, lawful bases, KVKK/GDPR notices, data-region
  requirements, cross-border safeguards, subprocessors, and breach contact.
- Set retention, deletion, anonymization, and legal-hold rules for profiles,
  registrations, rank evidence, moderation records, notifications, and audit
  logs.
- Which registration contact and identity fields are strictly necessary?
  Restricted access does not replace data minimization.
- Should organizer access to contact details or moderation evidence require a
  narrower role, just-in-time approval, or access logging?
- Define rights review, malware scanning, file type/size, takedown, and appeal
  workflows for team, player, supporter, stream, music, and uploaded assets.
- Which audit payload fields require redaction or external tamper-evident
  retention?
- Which production rate-limit buckets, thresholds, and non-reversible subject
  identifiers should the service-role backend use?

## Integrations and operations

- Which ranking, game, broadcast, identity, email, and moderation providers are
  approved? API secrets must remain outside database rows; only secret
  references should be stored.
- Define webhook signing, replay prevention, idempotency, retry, and
  source-of-truth behavior.
- Which roles need league-scoped assignment rather than the current global
  organizer/admin/captain model?
- What notification channels, retry schedules, opt-outs, and retention are
  required?
- Which records are authoritative versus derived, and what scheduled jobs
  rebuild standings, archive data, expire rate limits, and export audit logs?
- Confirm demo seeding is local-only and can never run against production.
