"use client";

import { useState, type FormEvent } from "react";

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
      const validateResponse = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const validateResult = (await validateResponse.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!validateResponse.ok || !validateResult.ok) {
        setError(validateResult.message ?? "The reset request could not be sent.");
        return;
      }

      const dispatchResponse = await fetch("/api/auth/dispatch-reset", {
        method: "POST",
        credentials: "same-origin",
      });
      const dispatchResult = (await dispatchResponse.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!dispatchResponse.ok || !dispatchResult.ok) {
        setError(dispatchResult.message ?? "The reset email could not be sent. Try again in a few minutes.");
        return;
      }

      setMessage(
        dispatchResult.message ??
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
