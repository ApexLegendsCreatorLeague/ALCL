export type LiveApiEventKind =
  | "match_setup"
  | "match_state"
  | "player_connected"
  | "player_disconnected"
  | "player_stat"
  | "player_killed"
  | "team_eliminated"
  | "unknown";

export type LiveApiMetric = "kills" | "assists" | "damage" | "knocks";

export type LiveApiEvent = Readonly<{
  id: string;
  sequence: number;
  occurredAt: string;
  type: string;
  kind: LiveApiEventKind;
  payload: Record<string, unknown>;
  gameState?: string;
  mapName?: string;
  teamKey?: string;
  teamName?: string;
  playerName?: string;
  metric?: LiveApiMetric;
  metricValue?: number;
  placement?: number;
}>;

export type LiveApiPlayerState = Readonly<{
  key: string;
  name: string;
  teamKey: string;
  connected: boolean;
  kills: number;
  assists: number;
  damage: number;
  knocks: number;
}>;

export type LiveApiTeamState = Readonly<{
  key: string;
  name?: string;
  eliminated: boolean;
  placement?: number;
  kills: number;
  assists: number;
  damage: number;
  knocks: number;
}>;

export type LiveApiMatchState = Readonly<{
  status: "waiting" | "playing" | "resolution" | "postmatch";
  mapName?: string;
  lastSequence: number;
  players: Record<string, LiveApiPlayerState>;
  teams: Record<string, LiveApiTeamState>;
}>;

const EMPTY_STATE: LiveApiMatchState = {
  status: "waiting",
  lastSequence: 0,
  players: {},
  teams: {},
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function atPath(value: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => record(current)?.[part], value);
}

function firstString(value: Record<string, unknown>, paths: readonly string[]) {
  for (const path of paths) {
    const candidate = atPath(value, path);
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
  }
}

function firstNumber(value: Record<string, unknown>, paths: readonly string[]) {
  for (const path of paths) {
    const candidate = atPath(value, path);
    const number = typeof candidate === "number" ? candidate : Number(candidate);
    if (Number.isFinite(number)) return number;
  }
}

function eventKind(type: string): LiveApiEventKind {
  const normalized = type.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.includes("matchsetup")) return "match_setup";
  if (normalized.includes("gamestate") || normalized.includes("matchstate")) return "match_state";
  if (normalized.includes("playerconnected")) return "player_connected";
  if (normalized.includes("playerdisconnected")) return "player_disconnected";
  if (normalized.includes("playerstatchanged")) return "player_stat";
  if (normalized.includes("playerkilled")) return "player_killed";
  if (normalized.includes("squadeliminated") || normalized.includes("teameliminated")) {
    return "team_eliminated";
  }
  return "unknown";
}

function metricName(value?: string): LiveApiMetric | undefined {
  const metric = value?.toLowerCase().replace(/[^a-z]/g, "");
  if (!metric) return;
  if (metric.includes("kill")) return "kills";
  if (metric.includes("assist")) return "assists";
  if (metric.includes("damage")) return "damage";
  if (metric.includes("knock")) return "knocks";
}

export function normalizeLiveApiEvent(input: {
  id: string;
  sequence: number;
  receivedAt: string;
  body: unknown;
}): LiveApiEvent {
  const envelope = record(input.body) ?? {};
  const payload =
    record(envelope.message) ??
    record(envelope.event) ??
    record(envelope.payload) ??
    envelope;
  const type =
    firstString(envelope, ["typeName", "type", "eventType", "name"]) ??
    firstString(payload, ["typeName", "type", "eventType", "name"]) ??
    "Unknown";
  const kind = eventKind(type);
  const playerName = firstString(payload, [
    "player.name",
    "playerName",
    "attacker.name",
    "victim.name",
    "name",
  ]);
  const teamKey = firstString(payload, [
    "player.teamId",
    "player.teamID",
    "team.id",
    "team.teamId",
    "teamId",
    "teamID",
    "squadId",
  ]);
  const teamName = firstString(payload, [
    "player.teamName",
    "team.name",
    "teamName",
    "squadName",
  ]);
  const statName = firstString(payload, ["statName", "stat.name", "stat", "category"]);
  const metric = kind === "player_stat" ? metricName(statName) : undefined;
  const metricValue = metric
    ? firstNumber(payload, ["newValue", "value", "statValue", "stat.value"])
    : undefined;
  const placement = firstNumber(payload, [
    "placement",
    "squadPlacement",
    "team.placement",
    "position",
  ]);
  const gameState = firstString(payload, ["state", "gameState", "matchState"]);
  const mapName = firstString(payload, ["map", "mapName", "map.name"]);

  return {
    id: input.id,
    sequence: input.sequence,
    occurredAt:
      firstString(payload, ["timestamp", "occurredAt"]) ?? input.receivedAt,
    type,
    kind,
    payload,
    gameState,
    mapName,
    teamKey,
    teamName,
    playerName,
    metric,
    metricValue,
    placement:
      placement && Number.isInteger(placement) && placement > 0
        ? placement
        : undefined,
  };
}

function normalizedKey(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function statusFromGameState(value?: string): LiveApiMatchState["status"] | undefined {
  switch (value?.toLowerCase()) {
    case "playing":
      return "playing";
    case "resolution":
      return "resolution";
    case "postmatch":
      return "postmatch";
    case "waitingforplayers":
    case "pickloadout":
    case "prematch":
      return "waiting";
  }
}

export function reduceLiveApiEvents(
  current: LiveApiMatchState = EMPTY_STATE,
  events: readonly LiveApiEvent[],
): LiveApiMatchState {
  let state: LiveApiMatchState = structuredClone(current);

  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    if (event.sequence <= state.lastSequence) continue;
    const players = { ...state.players };
    const teams = { ...state.teams };
    let status = state.status;
    let mapName = event.mapName ?? state.mapName;

    if (event.kind === "match_state") {
      status = statusFromGameState(event.gameState) ?? status;
    }

    if (event.kind === "match_setup" && event.mapName) mapName = event.mapName;

    if (event.teamKey) {
      teams[event.teamKey] = {
        key: event.teamKey,
        name: event.teamName ?? teams[event.teamKey]?.name,
        eliminated: teams[event.teamKey]?.eliminated ?? false,
        placement: teams[event.teamKey]?.placement,
        kills: teams[event.teamKey]?.kills ?? 0,
        assists: teams[event.teamKey]?.assists ?? 0,
        damage: teams[event.teamKey]?.damage ?? 0,
        knocks: teams[event.teamKey]?.knocks ?? 0,
      };
    }

    if (event.playerName && event.teamKey) {
      const playerKey = normalizedKey(event.playerName);
      const existing = players[playerKey];
      players[playerKey] = {
        key: playerKey,
        name: event.playerName,
        teamKey: event.teamKey,
        connected: event.kind !== "player_disconnected",
        kills: existing?.kills ?? 0,
        assists: existing?.assists ?? 0,
        damage: existing?.damage ?? 0,
        knocks: existing?.knocks ?? 0,
        ...(event.metric && event.metricValue !== undefined
          ? { [event.metric]: Math.max(0, event.metricValue) }
          : {}),
      };
    }

    if (event.kind === "team_eliminated" && event.teamKey) {
      const aliveTeams = Object.values(teams).filter((team) => !team.eliminated);
      const placement = event.placement ?? Math.max(2, aliveTeams.length);
      teams[event.teamKey] = {
        ...teams[event.teamKey],
        key: event.teamKey,
        eliminated: true,
        placement,
      };
    }

    const teamTotals = new Map<
      string,
      { kills: number; assists: number; damage: number; knocks: number }
    >();
    for (const player of Object.values(players)) {
      const total = teamTotals.get(player.teamKey) ?? {
        kills: 0,
        assists: 0,
        damage: 0,
        knocks: 0,
      };
      total.kills += player.kills;
      total.assists += player.assists;
      total.damage += player.damage;
      total.knocks += player.knocks;
      teamTotals.set(player.teamKey, total);
    }
    for (const [teamKey, total] of teamTotals) {
      teams[teamKey] = { ...teams[teamKey], key: teamKey, ...total };
    }

    if (status === "resolution" || status === "postmatch") {
      const survivors = Object.values(teams).filter((team) => !team.eliminated);
      if (survivors.length === 1) {
        teams[survivors[0].key] = { ...survivors[0], placement: 1 };
      }
    }

    state = { status, mapName, players, teams, lastSequence: event.sequence };
  }

  return state;
}

export function liveApiDraftResults(state: LiveApiMatchState) {
  return Object.values(state.teams)
    .filter(
      (team): team is LiveApiTeamState & { placement: number } =>
        team.placement !== undefined,
    )
    .sort((a, b) => a.placement - b.placement)
    .map((team) => ({
      teamKey: team.key,
      placement: team.placement,
      kills: team.kills,
      assists: team.assists,
      damage: team.damage,
      knocks: team.knocks,
    }));
}
