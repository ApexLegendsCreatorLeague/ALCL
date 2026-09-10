import type { NavUser } from "@/types/nav";

export function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PL";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function navUserFromParts(input: {
  profileId: string;
  displayName: string;
  username?: string | null;
  email?: string | null;
  metadataDisplayName?: unknown;
  canManageCompetitions?: boolean;
}): NavUser {
  const displayName =
    input.displayName.trim() ||
    (typeof input.metadataDisplayName === "string" ? input.metadataDisplayName.trim() : "") ||
    input.email?.split("@")[0] ||
    "Player";

  return {
    profileId: input.profileId,
    displayName,
    username: input.username ?? null,
    initials: initialsFor(displayName),
    canManageCompetitions: input.canManageCompetitions ?? false,
  };
}

export function navUserFromPlayerMe(payload: {
  profileId: string;
  displayName: string;
  username: string | null;
}): NavUser {
  return navUserFromParts({
    profileId: payload.profileId,
    displayName: payload.displayName,
    username: payload.username,
  });
}
