# Community tournament compliance notes

Reviewed September 5, 2026. This is an engineering control map, not legal advice.

## Sources

- [Apex Legends Community Tournament Guidelines (UK locale)](https://www.ea.com/en-gb/games/apex-legends/community-tournament-guidelines)
- [EA User Agreement](https://www.ea.com/legal/user-agreement), updated May 14, 2026
- [Positive Play Charter](https://www.ea.com/commitments/positive-play/charter)
- [EA Content Policy](https://help.ea.com/en/articles/security-and-rules/ea-content-policy/)

The default US Apex guideline omitted the Türkiye clause when reviewed, while
the UK Apex page and localized general guideline included it. ALCL applies the
stricter block and records the ambiguity in `OPEN_QUESTIONS.md`.

## Controls

- `COMMUNITY_TOURNAMENT_MODE` is enabled and
  `COMMERCIAL_AUTHORIZATION_ENABLED` is disabled.
- Entry fees and cash prizes are rejected in both application validation and
  PostgreSQL constraints/triggers.
- Non-cash prizes store a USD cash-value estimate. Organization-wide annual
  totals cannot exceed USD 10,000.
- Registration cannot open and play cannot begin until event-specific rules are
  published and snapshotted.
- Türkiye is blocked as an event operating territory with an explicit message.
- Supporters are treated as sponsors/partners for category moderation. A name
  cannot be inserted into a tournament title.
- Event distribution is limited to public streaming. TV and paid digital
  access are blocked.
- Tournament scale fields require review. A self-certified feature flag is not
  evidence of written authorization.
- Public pages and tournament materials show the exact Apex-specific
  independence disclaimer.
- The platform uses no EA, Respawn, ALGS, or game logos/artwork.
- Initial rank and result data is self-reported or organizer-entered. The
  external ingestion interface stays disabled without documented authorization.
- Participant contact data is separated from public profiles and protected by
  RLS.
- Match results, scoring configuration snapshots, registration rank snapshots,
  admin actions, and recalculations are auditable.

## Human controls that software cannot replace

- Verify rights to every uploaded logo, image, stream scene, and music track.
- Investigate the actual business and promoted material behind each supporter;
  category selection alone cannot prove eligibility.
- Review participant eligibility, local law, privacy, and guardian consent.
- Re-check EA's policies before each event.
- Obtain qualified advice and written clearance for larger or commercial uses.
