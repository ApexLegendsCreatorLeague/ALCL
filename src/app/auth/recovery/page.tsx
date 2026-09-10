import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { AuthRecoveryHandler } from "@/components/auth-recovery-handler";

export const metadata: Metadata = {
  title: "Confirming Reset Link",
  description: "Confirm your ALCL password reset link.",
};

export default function AuthRecoveryPage() {
  return (
    <AppShell>
      <AuthRecoveryHandler />
    </AppShell>
  );
}
