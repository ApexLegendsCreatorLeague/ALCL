import { aggregateMatchStandings, aggregateSeasonStandings, awardEventPoints } from "@/features/competition/scoring";
import { determineQualifications } from "@/features/competition/rules";
import type {
  League, Match, Player, PointsAwardConfig, ScoringConfig, Season, Supporter,
  Team, TiebreakRule, Tournament,
} from "@/types/domain";

const teamNames = [
  "Amber Orbit", "Boreal Foxes", "Cinder Kites", "Delta Bloom", "Echo Harbor",
  "Fable Circuit", "Glimmer Wolves", "Hollow Comets", "Indigo Forge", "Juniper Pulse",
  "Kestrel Vale", "Lumen Ravens", "Mosaic Drift", "Nimbus Guild", "Opal Current",
  "Prairie Sparks", "Quartz Roam", "Ripple Crown", "Solstice Crew", "Tundra Violet",
] as const;
const handles = ["Aster", "Brisk", "Cobalt", "Dune", "Ember"] as const;

export const demoLeague: League = {
  id: "league-aurora", name: "Aurora Community League", territory: "United States",
};
export const demoPlayers: readonly Player[] = teamNames.flatMap((teamName, teamIndex) =>
  handles.map((handle, slot) => ({
    id: `player-${teamIndex + 1}-${slot + 1}`,
    displayName: `${teamName.split(" ")[0]} ${handle}`,
    countryCode: ["US", "CA", "MX", "BR", "GB"][slot],
    rankHistory: [
      { rank: slot === 0 && teamIndex % 5 === 0 ? "Predator" as const : slot === 1 ? "Master" as const : "Diamond" as const, capturedAt: "2026-01-10T12:00:00.000Z", source: "manual" as const },
      { rank: slot === 0 && teamIndex % 5 === 0 ? "Predator" as const : "Diamond" as const, capturedAt: "2026-03-10T12:00:00.000Z", source: "manual" as const },
    ],
  })),
);
export const demoTeams: readonly Team[] = teamNames.map((name, index) => ({
  id: `team-${index + 1}`, name,
  shortName: name.split(" ").map((word) => word[0]).join(""),
  roster: demoPlayers.slice(index * 5, index * 5 + 5)
    .map(({ id }) => ({ playerId: id, joinedAt: "2026-01-05T12:00:00.000Z" })),
}));
export const demoSeason: Season = {
  id: "season-2026", leagueId: demoLeague.id, name: "Aurora 2026",
  startsAt: "2026-02-01T18:00:00.000Z", endsAt: "2026-07-31T23:00:00.000Z",
  tournamentIds: [1, 2, 3, 4, 5].map((value) => `tournament-${value}`),
};
export const demoTournaments: readonly Tournament[] = [
  "Dawn Open", "Crosswind Cup", "Northlight Clash", "Summer Signal", "Aurora Final",
].map((name, index) => ({
  id: `tournament-${index + 1}`, seasonId: demoSeason.id, name,
  startsAt: `2026-0${index + 2}-15T18:00:00.000Z`,
  rosterLockAt: `2026-0${index + 2}-10T18:00:00.000Z`,
  status: "complete" as const, rulesPublishedAt: "2026-01-15T18:00:00.000Z",
}));

function createMatch(eventIndex: number, sequence: number): Match {
  const tournament = demoTournaments[eventIndex];
  const id = `match-${eventIndex + 1}-${sequence}`;
  return {
    id, tournamentId: tournament.id, sequence, playedAt: tournament.startsAt,
    observerCount: (eventIndex + sequence) % 6,
    lineups: demoTeams.map((team) => ({
      teamId: team.id, playerIds: team.roster.slice(0, 3).map(({ playerId }) => playerId),
    })),
    results: demoTeams.map((team, index) => {
      const placement = ((index + sequence * 3 + eventIndex * 5) % 20) + 1;
      return {
        matchId: id, tournamentId: tournament.id, sequence, teamId: team.id, placement,
        kills: (index * 2 + sequence + eventIndex) % 9, multiplier: sequence === 3 ? 1.25 : 1,
        bonuses: placement === 1
          ? [{ id: `${id}:${team.id}:b`, category: "featured", points: 1, reason: "Featured win" }]
          : [],
        penalties: index === (sequence + eventIndex) % 20
          ? [{ id: `${id}:${team.id}:p`, category: "late", points: 1, reason: "Late readiness" }]
          : [],
      };
    }),
  };
}
export const demoMatches = demoTournaments.flatMap((_, eventIndex) =>
  [1, 2, 3].map((sequence) => createMatch(eventIndex, sequence)));
export const demoScoringConfig: ScoringConfig = {
  placementPoints: { 1: 12, 2: 9, 3: 7, 4: 5, 5: 4, 6: 3, 7: 3, 8: 2, 9: 2, 10: 1 },
  pointsPerKill: 1, bonusCategoryMultipliers: { featured: 2 },
  penaltyCategoryMultipliers: { late: 1 }, defaultMultiplier: 1, minimumMatchPoints: 0,
};
export const demoTiebreakers: readonly TiebreakRule[] = [
  { metric: "points", direction: "desc" }, { metric: "wins", direction: "desc" },
  { metric: "kills", direction: "desc" }, { metric: "bestPlacement", direction: "asc" },
  { metric: "lastMatchPoints", direction: "desc" }, { metric: "teamId", direction: "asc" },
];
const eventAwards: PointsAwardConfig = {
  byRank: { 1: 25, 2: 20, 3: 16, 4: 13, 5: 11, 6: 10, 7: 9, 8: 8, 9: 7, 10: 6 },
  defaultPoints: 2,
};
const seasonAwards: PointsAwardConfig = {
  byRank: { 1: 100, 2: 80, 3: 65, 4: 55, 5: 48, 6: 42, 7: 36, 8: 30, 9: 25, 10: 20 },
  defaultPoints: 5,
};
export const demoEventStandings = demoTournaments.map(({ id }) => awardEventPoints(
  aggregateMatchStandings(demoMatches.filter((match) => match.tournamentId === id)
    .flatMap(({ results }) => results), demoScoringConfig, demoTiebreakers), eventAwards));
export const demoSeasonStandings = aggregateSeasonStandings(demoEventStandings, seasonAwards, demoTiebreakers);
export const demoQualifications = determineQualifications(demoSeasonStandings, {
  id: "qualification-top-8", name: "Aurora Final Top Eight",
  source: "season", topN: 8, minimumPoints: 1,
}, "2026-07-01T18:00:00.000Z");
export const demoSupporters: readonly Supporter[] = [
  { id: "supporter-1", name: "Northstar Learning", category: "education", annualNonCashValueUsd: 1200 },
  { id: "supporter-2", name: "Civic Loom", category: "apparel", annualNonCashValueUsd: 900 },
  { id: "supporter-3", name: "Bright Circuit Labs", category: "technology", annualNonCashValueUsd: 1800 },
];
export const demoHallOfFame = [
  { id: "honor-1", title: "Community Season Champion", recipient: "Amber Orbit", season: "2025" },
  { id: "honor-2", title: "Community MVP", recipient: "Amber Aster", season: "2025" },
] as const;
export const demoNotifications = [
  { id: "notice-1", title: "Registration approved", read: false },
  { id: "notice-2", title: "Season standings updated", read: true },
] as const;
export const demoProfiles = demoPlayers.map((player) => ({
  id: player.id,
  displayName: player.displayName,
  role: "player" as const,
  demo: true,
}));
export const demoData = {
  league: demoLeague, season: demoSeason, tournaments: demoTournaments, teams: demoTeams,
  players: demoPlayers, matches: demoMatches, eventStandings: demoEventStandings,
  seasonStandings: demoSeasonStandings, supporters: demoSupporters, qualifications: demoQualifications,
  hallOfFame: demoHallOfFame, notifications: demoNotifications, profiles: demoProfiles,
} as const;
