export type TournamentStatus =
  | "Registration Open"
  | "Registration Closed"
  | "Upcoming"
  | "Live"
  | "Completed";

export const season = {
  id: "season-1",
  name: "ALCL Season One",
  status: "Active",
  start: "Aug 15, 2026",
  end: "Dec 12, 2026",
};

export const tournaments = [
  {
    id: "community-open-1",
    name: "ALCL Community Open #1",
    date: "Sep 12, 2026",
    deadline: "Sep 9, 2026",
    status: "Registration Open" as TournamentStatus,
    format: "20 teams · 6 matches",
    teams: 17,
    description: "The opening community competition of ALCL Season One.",
  },
  {
    id: "creator-cup",
    name: "ALCL Creator Cup",
    date: "Oct 3, 2026",
    deadline: "Sep 28, 2026",
    status: "Upcoming" as TournamentStatus,
    format: "Invitational · 6 matches",
    teams: 20,
    description: "Creators and community teams meet in a six-match event.",
  },
  {
    id: "community-open-2",
    name: "ALCL Community Open #2",
    date: "Oct 24, 2026",
    deadline: "Oct 19, 2026",
    status: "Upcoming" as TournamentStatus,
    format: "20 teams · 6 matches",
    teams: 20,
    description: "The second open event on the Season Qualification path.",
  },
  {
    id: "community-major",
    name: "ALCL Community Major",
    date: "Nov 14, 2026",
    deadline: "Nov 8, 2026",
    status: "Upcoming" as TournamentStatus,
    format: "Qualified · 8 matches",
    teams: 20,
    description: "A longer community event with configurable season weighting.",
  },
  {
    id: "community-open-3",
    name: "ALCL Community Open #3",
    date: "Dec 5, 2026",
    deadline: "Nov 30, 2026",
    status: "Upcoming" as TournamentStatus,
    format: "20 teams · 6 matches",
    teams: 20,
    description: "The final open before the Community Championship.",
  },
];

const teamSeeds = [
  ["Northstar", "NST", "North America"],
  ["Emberline", "EMB", "North America"],
  ["Violet Circuit", "VCT", "Europe"],
  ["Drift Union", "DRU", "North America"],
  ["Solar Echo", "SEC", "Europe"],
  ["Night Relay", "NRL", "North America"],
  ["Summit House", "SMT", "Europe"],
  ["Copper Sky", "CSK", "Oceania"],
  ["Afterglow", "AFT", "North America"],
  ["Static Bloom", "STB", "Europe"],
  ["Lunar Divide", "LND", "North America"],
  ["Redwood Three", "RWT", "North America"],
  ["Cloud District", "CLD", "Oceania"],
  ["Prism Forge", "PRF", "Europe"],
  ["Kinetic Club", "KNC", "North America"],
  ["Blue Comet", "BCM", "Asia Pacific"],
  ["Signal Peak", "SGP", "Europe"],
  ["Golden Hour", "GLH", "North America"],
  ["Orbit Society", "ORB", "Asia Pacific"],
  ["Cinder Crew", "CND", "North America"],
] as const;

export const teams = teamSeeds.map(([name, abbreviation, region], index) => ({
  id: name.toLowerCase().replaceAll(" ", "-"),
  name,
  abbreviation,
  region,
  rank: index + 1,
  eventsPlayed: index < 12 ? 3 : 2,
  wins: Math.max(0, 4 - Math.floor(index / 4)),
  top5: Math.max(1, 11 - Math.floor(index / 2)),
  kills: 128 - index * 4,
  eventPoints: Math.max(18, 92 - index * 3),
  seasonPoints: Math.max(20, 126 - index * 5),
  movement: index % 4 === 0 ? 2 : index % 3 === 0 ? -1 : 0,
  description: `${name} is a fictional ALCL development team competing from ${region}.`,
}));

const handles = [
  "Aster",
  "Brim",
  "Cipher",
  "Dovetail",
  "Echo",
  "Flint",
  "Glyph",
  "Halo",
  "Ion",
  "Juniper",
  "Kite",
  "Lumen",
  "Mosaic",
  "Nova",
  "Onyx",
  "Pulse",
  "Quartz",
  "Rook",
  "Sable",
  "Tempo",
  "Umbra",
  "Vela",
  "Wisp",
  "Xylo",
  "Yarrow",
  "Zephyr",
  "Arc",
  "Beacon",
  "Crest",
  "Delta",
  "Fable",
  "Grove",
  "Harbor",
  "Indigo",
  "Jolt",
  "Knoll",
  "Loft",
  "Morrow",
  "Nimble",
  "Opal",
  "Pillar",
  "Quest",
  "Rivet",
  "Solace",
  "Tide",
  "Unity",
  "Vale",
  "West",
  "Yonder",
  "Zenith",
  "Axiom",
  "Briar",
  "Canvas",
  "Dune",
  "Ever",
  "Frost",
  "Glint",
  "Hearth",
  "Iris",
  "Jet",
  "Keystone",
  "Lake",
  "Meridian",
  "Nexus",
];

const roles = ["IGL", "Fragger", "Support", "Flex", "Substitute"] as const;

export const players = handles.map((displayName, index) => {
  const team = teams[index % teams.length];
  return {
    id: displayName.toLowerCase(),
    displayName,
    teamId: team.id,
    team: team.name,
    role: roles[index % roles.length],
    region: team.region,
    rank: index % 19 === 0 ? "Predator" : index % 4 === 0 ? "Master" : "Diamond",
    kills: 54 - (index % 22),
    wins: 6 - (index % 5),
    seasonPoints: Math.max(12, 91 - index),
  };
});

export const recentMatches = [
  { number: 6, map: "Storm Point", winner: "Northstar", score: 23, status: "Final" },
  { number: 5, map: "World's Edge", winner: "Violet Circuit", score: 19, status: "Final" },
  { number: 4, map: "Storm Point", winner: "Emberline", score: 21, status: "Final" },
  { number: 3, map: "World's Edge", winner: "Northstar", score: 17, status: "Final" },
];

export const supporters = [
  {
    id: "local-lan-cooperative",
    name: "Local LAN Cooperative",
    description: "Volunteer venue and equipment support for community play.",
  },
  {
    id: "creator-commons",
    name: "Creator Commons",
    description: "Community education and broadcast production support.",
  },
  {
    id: "open-signal-studio",
    name: "Open Signal Studio",
    description: "Independent creative support for original ALCL graphics.",
  },
];

export const announcements = [
  { title: "Registration is open", date: "Sep 5", body: "Team managers can submit a five-player roster." },
  { title: "Rules review", date: "Sep 3", body: "Event-specific rules must be accepted before submission." },
  { title: "Season standings updated", date: "Aug 31", body: "The latest audited results are now published." },
];

export function findTournament(id: string) {
  return tournaments.find((tournament) => tournament.id === id);
}

export function findTeam(id: string) {
  return teams.find((team) => team.id === id);
}

export function findPlayer(id: string) {
  return players.find((player) => player.id === id);
}
