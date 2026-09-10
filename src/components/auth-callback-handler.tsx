"use client";

import { useEffect } from "react";

import {
  completeAuthReturn,
  redirectAuthReturnFailure,
} from "@/lib/auth/complete-auth-return";

export function AuthCallbackHandler({
  eyebrow = "Account Access",
  title = "One moment…",
  message = "Confirming your secure link…",
  recoveryOnly = false,
  defaultNext,
}: {
  eyebrow?: string;
  title?: string;
  message?: string;
  recoveryOnly?: boolean;
  defaultNext?: string;
}) {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result = await completeAuthReturn({ recoveryOnly, defaultNext });
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        redirectAuthReturnFailure(result.failure);
        return;
      }

      window.location.replace(result.redirectTo);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [recoveryOnly, defaultNext]);

  return (
    <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
      <div className="card" style={{ width: "min(440px, 100%)" }}>
        <div className="eyebrow">{eyebrow}</div>
        <h3 style={{ fontSize: 30 }}>{title}</h3>
        <p className="legal">{message}</p>
      </div>
    </div>
  );
}
