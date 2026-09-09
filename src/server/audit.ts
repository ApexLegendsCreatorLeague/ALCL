import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditAction, Json } from "@/types/database";

const hashOptional = (value?: string) =>
  value ? createHash("sha256").update(value, "utf8").digest("hex") : null;

export async function recordAuditEvent(input: {
  actorId?: string | null;
  action: AuditAction;
  tableName: string;
  recordId?: string;
  requestId?: string;
  ipAddress?: string;
  metadata?: Record<string, Json | undefined>;
}): Promise<void> {
  if (!/^[a-z_][a-z0-9_]*$/i.test(input.tableName)) {
    throw new TypeError("Invalid audit table name.");
  }

  const metadata = Object.fromEntries(
    Object.entries(input.metadata ?? {}).filter((entry) => entry[1] !== undefined),
  ) as Record<string, Json>;
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_id: input.actorId ?? null,
    action: input.action,
    table_name: input.tableName,
    record_id: input.recordId ?? null,
    request_id: input.requestId ?? null,
    ip_hash: hashOptional(input.ipAddress),
    metadata,
  });

  if (error) throw new Error("Unable to persist audit event.", { cause: error });
}
