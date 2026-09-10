"use client";

import { AuthCallbackHandler } from "@/components/auth-callback-handler";

export function AuthRecoveryHandler() {
  return (
    <AuthCallbackHandler
      recoveryOnly
      eyebrow="Password Reset"
      title="One moment…"
      message="Confirming your reset link…"
    />
  );
}
