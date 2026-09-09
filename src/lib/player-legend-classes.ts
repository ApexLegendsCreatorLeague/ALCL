export const APEX_LEGEND_CLASSES = [
  "Assault",
  "Skirmisher",
  "Recon",
  "Support",
  "Controller",
] as const;

export type ApexLegendClass = (typeof APEX_LEGEND_CLASSES)[number];

export function parsePreferredRoles(value: string | null | undefined): ApexLegendClass[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((role) => role.trim())
    .filter((role): role is ApexLegendClass =>
      APEX_LEGEND_CLASSES.includes(role as ApexLegendClass),
    );
}

export function serializePreferredRoles(roles: readonly string[]): string | null {
  const normalized = roles
    .map((role) => role.trim())
    .filter((role): role is ApexLegendClass =>
      APEX_LEGEND_CLASSES.includes(role as ApexLegendClass),
    );

  return normalized.length ? normalized.join(", ") : null;
}
