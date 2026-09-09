"use client";

import { useEffect, useState } from "react";

type AuthStatus = {
  configured: boolean;
  hasSupabaseUrl: boolean;
  hasAnonKey: boolean;
  hasServiceRole: boolean;
  hint: string;
};

export function AuthConfigBanner() {
  const [status, setStatus] = useState<AuthStatus | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((response) => response.json())
      .then((payload: AuthStatus) => setStatus(payload))
      .catch(() => {
        setStatus({
          configured: false,
          hasSupabaseUrl: false,
          hasAnonKey: false,
          hasServiceRole: false,
          hint: "Could not reach /api/auth/status.",
        });
      });
  }, []);

  if (!status || status.configured) return null;

  return (
    <div
      className="card"
      role="alert"
      style={{ marginBottom: "1rem", borderColor: "#ff6b3566" }}
    >
      <strong>Server not connected to Supabase</strong>
      <p className="legal" style={{ marginTop: 8 }}>
        Missing:{" "}
        {!status.hasSupabaseUrl ? "SUPABASE_URL " : ""}
        {!status.hasAnonKey ? "SUPABASE_ANON_KEY " : ""}
        {!status.hasServiceRole ? "SUPABASE_SERVICE_ROLE_KEY " : ""}
      </p>
      <p className="legal">{status.hint}</p>
    </div>
  );
}
