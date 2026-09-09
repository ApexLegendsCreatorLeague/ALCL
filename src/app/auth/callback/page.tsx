import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { AuthCallbackHandler } from "@/components/auth-callback-handler";

export const metadata: Metadata = {
  title: "Confirming sign in",
  description: "Complete your secure ALCL sign-in or account link.",
};

export default function AuthCallbackPage() {
  return (
    <AppShell>
      <AuthCallbackHandler />
    </AppShell>
  );
}
