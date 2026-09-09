"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export function ResetPasswordForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string; redirectTo?: string };

      if (!response.ok || !result.ok) {
        setError(result.message ?? "Your password could not be updated.");
        return;
      }

      window.location.assign(result.redirectTo ?? "/login?reset=success");
    } catch {
      setError("The password update could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label className="field">
        New password
        <input
          className="input"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label className="field">
        Confirm new password
        <input
          className="input"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {error ? (
        <p role="alert" className="legal">
          {error}
        </p>
      ) : null}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Updating password…" : "Save new password"}
      </button>
      <p className="legal">
        Link expired? <Link href="/forgot-password">Request a new reset link</Link>
      </p>
    </form>
  );
}
