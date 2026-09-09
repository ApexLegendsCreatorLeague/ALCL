"use client";

import { useState, type FormEvent } from "react";

import { createBrowserSupabaseAsync } from "@/lib/supabase/browser";

const RESET_RECOVERY_PATH = "/auth/recovery";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        dispatchReset?: boolean;
        email?: string;
      };

      if (!response.ok || !result.ok) {
        setError(result.message ?? "The reset request could not be sent.");
        return;
      }

      if (result.dispatchReset && result.email) {
        const supabase = await createBrowserSupabaseAsync();
        if (!supabase) {
          setError(
            "Password reset is not configured in this browser. Contact an organizer for help.",
          );
          return;
        }

        const redirectTo = `${window.location.origin}${RESET_RECOVERY_PATH}`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(result.email, {
          redirectTo,
        });

        if (resetError) {
          setError("The reset email could not be sent. Try again in a few minutes.");
          return;
        }
      }

      setMessage(
        result.message ??
          "If the email and account name match an ALCL player account, a password reset link is on its way.",
      );
    } catch {
      setError("The reset request could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label className="field">
        Player email
        <input className="input" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Account name
        <input
          className="input"
          name="accountName"
          type="text"
          autoComplete="nickname"
          minLength={2}
          maxLength={50}
          required
          placeholder="Your ALCL display name"
        />
      </label>
      <p className="legal">
        Use the same account name you chose when you registered. This helps make sure the reset link
        goes to the right player.
      </p>
      {error ? (
        <p role="alert" className="legal">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="legal">
          {message}
        </p>
      ) : null}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Sending reset link…" : "Email password reset link"}
      </button>
    </form>
  );
}
