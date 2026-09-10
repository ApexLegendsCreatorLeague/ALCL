"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ResetPasswordForm } from "@/components/reset-password-form";
import { createBrowserSupabaseAsync } from "@/lib/supabase/browser";

type GateState = "loading" | "ready" | "expired";

export function ResetPasswordGate() {
  const [state, setState] = useState<GateState>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function establishRecoverySession() {
      const supabase = await createBrowserSupabaseAsync();
      if (!supabase) {
        if (!cancelled) {
          setState("expired");
        }
        return;
      }

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (accessToken && refreshToken && type === "recovery") {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          window.history.replaceState(null, "", window.location.pathname);
        }
      }

      const query = new URLSearchParams(window.location.search);
      const tokenHash = query.get("token_hash");
      const type = query.get("type");
      if (tokenHash && type === "recovery") {
        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        window.history.replaceState(null, "", window.location.pathname);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        if (!cancelled) {
          setEmail(user.email);
          setState("ready");
        }
        return;
      }

      const response = await fetch("/api/auth/session", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await response.json()) as { user?: { email?: string | null } | null };

      if (!cancelled) {
        if (payload.user?.email) {
          setEmail(payload.user.email);
          setState("ready");
        } else {
          setState("expired");
        }
      }
    }

    void establishRecoverySession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return <p className="legal">Checking your reset link…</p>;
  }

  if (state === "expired") {
    return (
      <>
        <p role="alert" className="legal">
          That reset link expired or was already used. Request a new one below.
        </p>
        <p className="legal">
          <Link href="/forgot-password">Request a New Reset Link</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <p className="legal" style={{ marginBottom: "1rem" }}>
        Signed in as <strong>{email}</strong>. Pick a new ALCL password below.
      </p>
      <ResetPasswordForm />
    </>
  );
}
