import type {
  EligibilityIssue, Match, MatchLineup, Player, RankSnapshot,
  RosterEligibilityConfig, Team,
} from "@/types/domain";

const time = (value: string): number => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`Invalid date: ${value}`);
  return parsed;
};

export function rankAt(player: Player, at: string): RankSnapshot | undefined {
  const cutoff = time(at);
  return [...player.rankHistory]
    .filter((snapshot) => time(snapshot.capturedAt) <= cutoff)
    .sort((a, b) => time(b.capturedAt) - time(a.capturedAt))[0];
}

export function activeRosterAt(team: Team, at: string): readonly string[] {
  const cutoff = time(at);
  return team.roster
    .filter(({ joinedAt, leftAt }) => time(joinedAt) <= cutoff && (!leftAt || time(leftAt) > cutoff))
    .map(({ playerId }) => playerId);
}

export function validateRosterEligibility(
  team: Team,
  playersById: ReadonlyMap<string, Player>,
  config: RosterEligibilityConfig,
): readonly EligibilityIssue[] {
  const roster = activeRosterAt(team, config.rosterLockAt);
  const issues: EligibilityIssue[] = [];
  if (new Set(roster).size !== roster.length)
    issues.push({ code: "DUPLICATE_PLAYER", teamId: team.id, message: "Roster contains a duplicate player." });
  if (roster.length < config.minimumRosterSize)
    issues.push({ code: "ROSTER_TOO_SMALL", teamId: team.id, message: `Roster requires at least ${config.minimumRosterSize} players.` });
  if (roster.length > config.maximumRosterSize)
    issues.push({ code: "ROSTER_TOO_LARGE", teamId: team.id, message: "Roster cannot exceed 5 active players." });

  let predators = 0;
  for (const playerId of roster) {
    const player = playersById.get(playerId);
    const snapshot = player && rankAt(player, config.rosterLockAt);
    if (!snapshot)
      issues.push({ code: "MISSING_RANK_SNAPSHOT", teamId: team.id, playerId, message: "Player needs a rank snapshot at roster lock." });
    else if (snapshot.rank === "Predator") predators += 1;
  }
  if (predators > config.maximumPredators)
    issues.push({ code: "TOO_MANY_PREDATORS", teamId: team.id, message: `Roster has ${predators} Predators; maximum is ${config.maximumPredators}.` });
  return issues;
}

export function validateLineup(
  lineup: MatchLineup,
  team: Team,
  config: RosterEligibilityConfig,
): readonly EligibilityIssue[] {
  const issues: EligibilityIssue[] = [];
  const unique = new Set(lineup.playerIds);
  if (lineup.playerIds.length !== config.lineupSize)
    issues.push({ code: "LINEUP_SIZE", teamId: team.id, message: "A match lineup must contain exactly 3 players." });
  if (unique.size !== lineup.playerIds.length)
    issues.push({ code: "DUPLICATE_PLAYER", teamId: team.id, message: "A lineup cannot contain duplicate players." });
  const roster = new Set(activeRosterAt(team, config.rosterLockAt));
  for (const playerId of unique)
    if (!roster.has(playerId))
      issues.push({ code: "PLAYER_NOT_ON_ROSTER", teamId: team.id, playerId, message: "Lineup player was not on the locked roster." });
  return issues;
}

export function validateMatchCapacity(match: Match): readonly EligibilityIssue[] {
  const issues: EligibilityIssue[] = [];
  const active = match.lineups.reduce((count, lineup) => count + lineup.playerIds.length, 0);
  if (active > 60)
    issues.push({ code: "ACTIVE_PLAYER_LIMIT", message: "A private match supports at most 60 active players." });
  if (match.observerCount > 5)
    issues.push({ code: "OBSERVER_LIMIT", message: "A private match supports at most 5 observers." });
  return issues;
}
