export const DEFAULT_PLAYER_HOME = "/dashboard/player";

export function safeNextPath(next: string | null | undefined, fallback = DEFAULT_PLAYER_HOME) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}
