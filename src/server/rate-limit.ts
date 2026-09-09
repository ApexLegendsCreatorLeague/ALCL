import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitDecision = Readonly<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}>;

export async function consumeRateLimit(input: {
  scope: string;
  subject: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitDecision> {
  if (
    !/^[a-z0-9:_-]{1,80}$/i.test(input.scope) ||
    !Number.isInteger(input.limit) ||
    input.limit <= 0 ||
    !Number.isInteger(input.windowSeconds) ||
    input.windowSeconds <= 0
  ) {
    throw new TypeError("Invalid rate-limit configuration.");
  }

  const subjectHash = createHash("sha256")
    .update(input.subject, "utf8")
    .digest("hex");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_scope: input.scope,
    p_subject_hash: subjectHash,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
  });

  if (error || !data?.[0]) {
    throw new Error("Rate-limit service is unavailable.");
  }

  return {
    allowed: data[0].allowed,
    remaining: data[0].remaining,
    resetAt: new Date(data[0].reset_at),
  };
}
