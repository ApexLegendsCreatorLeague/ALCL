"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

type VerifyResponse =
  | {
      ok: true;
      rank: string;
      apexTag: string;
      message?: string;
    }
  | { ok: false; message: string };

export function VerifyRankPanel({
  displayName,
  platform,
  currentRank,
  currentTag,
  verifiedAt,
}: {
  displayName: string;
  platform: string | null;
  currentRank: string | null;
  currentTag: string | null;
  verifiedAt: string | null;
}) {
  const [teamTag, setTeamTag] = useState(currentTag ?? "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [rank, setRank] = useState(currentRank);
  const [tag, setTag] = useState(currentTag);
  const [verified, setVerified] = useState(Boolean(verifiedAt && currentTag && currentRank));

  async function verifyRank() {
    setPending(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/players/verify-rank", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamTag }),
      });
      const result = (await response.json()) as VerifyResponse;
      if (!response.ok || !result.ok) {
        setError(!result.ok ? result.message : "Rank verification failed.");
        return;
      }
      setRank(result.rank);
      setTag(result.apexTag);
      setVerified(true);
      setStatus(result.message ?? `Verified ${result.rank}.`);
    } catch {
      setError("Rank verification could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">Rank Verification</p>
      <h3>Verify Your Apex Rank</h3>
      <p className="legal">
        Your ALCL display name must match your Apex in-game name exactly (no Tag prefix). Set your
        team Tag in Apex under Friends → Tag, then verify here before your captain registers the
        team.
      </p>
      <ul className="profile-facts" style={{ marginTop: 12 }}>
        <li>
          <span>Display Name</span>
          <strong>{displayName}</strong>
        </li>
        <li>
          <span>Platform</span>
          <strong>{platform ?? "-"}</strong>
        </li>
        <li>
          <span>Verified Rank</span>
          <strong>{rank ?? "Not verified"}</strong>
        </li>
        <li>
          <span>Team Tag</span>
          <strong>{tag ?? "-"}</strong>
        </li>
      </ul>
      <label className="field" style={{ marginTop: 16 }}>
        Team Tag (3-4 characters)
        <input
          className="input"
          value={teamTag}
          maxLength={4}
          placeholder="ALCL"
          onChange={(event) => setTeamTag(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        />
      </label>
      {verified ? (
        <p className="legal" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ShieldCheck size={16} color="var(--lime)" />
          Rank verified{verifiedAt ? ` · last saved ${new Date(verifiedAt).toLocaleString()}` : ""}.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="legal">
          {error}
        </p>
      ) : null}
      {status ? (
        <p role="status" className="legal">
          {status}
        </p>
      ) : null}
      <div className="actions">
        <button className="btn btn-primary" type="button" disabled={pending || teamTag.length < 3} onClick={verifyRank}>
          {pending ? "Verifying…" : verified ? "Re-Verify Rank" : "Verify Rank"}
        </button>
      </div>
    </div>
  );
}
