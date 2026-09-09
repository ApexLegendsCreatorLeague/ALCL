import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export class AuthenticationError extends Error {
  readonly code = "UNAUTHENTICATED";

  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";

  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  return user;
}

export async function getUserRoles(userId?: string): Promise<AppRole[]> {
  const user = await requireUser();
  if (userId && user.id !== userId) {
    throw new AuthorizationError("Users may only inspect their own roles.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_roles")
    .select("role, expires_at")
    .eq("profile_id", user.id);

  if (error) throw new AuthorizationError("Unable to verify assigned roles.");
  const now = Date.now();
  return data
    .filter(({ expires_at }) => !expires_at || Date.parse(expires_at) > now)
    .map(({ role }) => role);
}

export async function requireRole(
  allowedRoles: readonly AppRole[],
): Promise<{ user: User; roles: AppRole[] }> {
  const user = await requireUser();
  const roles = await getUserRoles(user.id);
  if (!roles.some((role) => allowedRoles.includes(role))) {
    throw new AuthorizationError();
  }
  return { user, roles };
}

export const requireCompetitionManager = () =>
  requireRole(["admin", "organizer"]);
