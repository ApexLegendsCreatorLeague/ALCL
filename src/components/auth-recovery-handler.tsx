"use client";

import { AuthCallbackHandler } from "@/components/auth-callback-handler";

export function AuthRecoveryHandler() {
  return (
    <AuthCallbackHandler
      recoveryOnly
      eyebrow="Password reset"
      title="One moment…"
      message="Confirming your reset link…"
    />
  );
}
