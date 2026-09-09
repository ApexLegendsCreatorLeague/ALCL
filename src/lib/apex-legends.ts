/** Playable Apex Legends roster for profile top-legend picks. */
export const APEX_LEGENDS = [
  "Alter",
  "Ash",
  "Axle",
  "Ballistic",
  "Bangalore",
  "Bloodhound",
  "Catalyst",
  "Caustic",
  "Conduit",
  "Crypto",
  "Fuse",
  "Gibraltar",
  "Horizon",
  "Lifeline",
  "Loba",
  "Mad Maggie",
  "Mirage",
  "Newcastle",
  "Octane",
  "Pathfinder",
  "Rampart",
  "Revenant",
  "Seer",
  "Sparrow",
  "Valkyrie",
  "Vantage",
  "Wattson",
  "Wraith",
] as const;

export type ApexLegend = (typeof APEX_LEGENDS)[number];

export type TopLegends = [string | null, string | null, string | null];

export function normalizeTopLegends(input: [string, string, string]): TopLegends {
  const seen = new Set<string>();

  return input.map((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (!(APEX_LEGENDS as readonly string[]).includes(trimmed) || seen.has(trimmed)) {
      return null;
    }
    seen.add(trimmed);
    return trimmed;
  }) as TopLegends;
}

export function topLegendsFromProfile(row: {
  main_legend_1?: string | null;
  main_legend_2?: string | null;
  main_legend_3?: string | null;
}): TopLegends {
  return [row.main_legend_1 ?? null, row.main_legend_2 ?? null, row.main_legend_3 ?? null];
}

export function hasTopLegends(legends: TopLegends) {
  return legends.some(Boolean);
}
