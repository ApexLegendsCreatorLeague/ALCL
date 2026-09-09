import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { AuthCallbackHandler } from "@/components/auth-callback-handler";

export const metadata: Metadata = {
  title: "Confirming account link",
  description: "Complete your secure ALCL account link.",
};

export default function AuthConfirmPage() {
  return (
    <AppShell>
      <AuthCallbackHandler recoveryOnly />
    </AppShell>
  );
}
