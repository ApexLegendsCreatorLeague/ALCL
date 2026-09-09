"use client";

import { useEffect } from "react";

import { createBrowserSupabaseAsync } from "@/lib/supabase/browser";

export function AuthRecoveryHandler() {
  useEffect(() => {
    let cancelled = false;

    async function completeRecovery() {
      const supabase = await createBrowserSupabaseAsync();
      if (!supabase) {
        window.location.assign("/login/forgot-password?error=reset_expired");
        return;
      }

      const query = new URLSearchParams(window.location.search);
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const type = query.get("type");

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashType = hashParams.get("type");

        if (accessToken && refreshToken && hashType === "recovery") {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            window.location.assign("/login/forgot-password?error=reset_expired");
            return;
          }
        }
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          window.location.assign("/login/forgot-password?error=reset_expired");
          return;
        }
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "recovery" | "signup" | "invite" | "magiclink" | "email_change" | "email",
        });
        if (error) {
          window.location.assign("/login/forgot-password?error=reset_expired");
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (user) {
        window.location.replace("/account/reset-password");
        return;
      }

      window.location.assign("/login/forgot-password?error=reset_expired");
    }

    void completeRecovery();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
      <div className="card" style={{ width: "min(440px, 100%)" }}>
        <div className="eyebrow">Password reset</div>
        <h3 style={{ fontSize: 30 }}>One moment…</h3>
        <p className="legal">Confirming your reset link…</p>
      </div>
    </div>
  );
}
