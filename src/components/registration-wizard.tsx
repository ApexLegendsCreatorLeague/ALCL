"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/alcl";
import { PlayerSlotPicker, type SelectedPlayer } from "@/components/player-slot-picker";

const steps = ["Team Information", "Roster", "Eligibility", "Review", "Submit"];

type RosterSlot = {
  player: SelectedPlayer | null;
  role: "IGL" | "Fragger" | "Support" | "Flex" | "Substitute";
};

type TeamManager = {
  playerId: string;
  profileId: string;
  displayName: string;
  username: string | null;
  email: string | null;
};

type RosterVerification = {
  playerId: string;
  displayName: string;
  verified: boolean;
  rank: string | null;
  apexTag: string | null;
  message: string | null;
};

const emptySlot = (): RosterSlot => ({
  player: null,
  role: "Flex",
});

type SubmitResult = {
  message?: string;
  id?: string;
  teamId?: string;
  status?: string;
};

export function RegistrationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [manager, setManager] = useState<TeamManager | null>(null);
  const [managerError, setManagerError] = useState("");
  const [verification, setVerification] = useState<RosterVerification[]>([]);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [form, setForm] = useState({
    teamName: "",
    abbreviation: "",
    teamTag: "",
    region: "North America",
    website: "",
    socialLink: "",
    roster: Array.from({ length: 5 }, emptySlot),
    eligibilityAccepted: false,
    rosterLockAccepted: false,
    rulesAccepted: false,
  });

  useEffect(() => {
    fetch("/api/players/me")
      .then(async (response) => {
        const payload = (await response.json()) as TeamManager & { message?: string };
        if (!response.ok) {
          throw new Error(payload.message ?? "Sign in required.");
        }
        if (!payload.playerId || !payload.displayName) {
          throw new Error("Your player profile is not ready yet.");
        }
        setManager(payload);
        setManagerError("");
        setForm((current) => ({
          ...current,
          roster: current.roster.map((slot, index) =>
            index === 0
              ? {
                  ...slot,
                  player: {
                    playerId: payload.playerId,
                    profileId: payload.profileId,
                    displayName: payload.displayName,
                    username: payload.username,
                    email: payload.email,
                  },
                  role: "IGL",
                }
              : slot,
          ),
        }));
      })
      .catch((loadError: unknown) => {
        setManagerError(
          loadError instanceof Error ? loadError.message : "Sign in to create a team.",
        );
      });
  }, []);

  const selectedIds = useMemo(
    () => form.roster.map((slot) => slot.player?.playerId).filter(Boolean) as string[],
    [form.roster],
  );

  const verificationById = useMemo(
    () => new Map(verification.map((entry) => [entry.playerId, entry])),
    [verification],
  );

  useEffect(() => {
    if (selectedIds.length === 0 || form.teamTag.trim().length < 3) {
      setVerification([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setVerificationLoading(true);
      try {
        const params = new URLSearchParams({
          ids: selectedIds.join(","),
          teamTag: form.teamTag.trim().toUpperCase(),
        });
        const response = await fetch(`/api/players/roster-verification?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as { players?: RosterVerification[] };
        if (!controller.signal.aborted) {
          setVerification(payload.players ?? []);
        }
      } catch {
        if (!controller.signal.aborted) setVerification([]);
      } finally {
        if (!controller.signal.aborted) setVerificationLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [selectedIds, form.teamTag]);

  const predatorCount = useMemo(
    () =>
      verification.filter((entry) => entry.verified && entry.rank === "Predator").length,
    [verification],
  );

  const allSelectedVerified = useMemo(
    () =>
      selectedIds.length > 0 &&
      selectedIds.every((playerId) => verificationById.get(playerId)?.verified),
    [selectedIds, verificationById],
  );

  const eligible = predatorCount <= 1 && allSelectedVerified;

  function updateSlot(index: number, patch: Partial<RosterSlot>) {
    setForm((current) => ({
      ...current,
      roster: current.roster.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot,
      ),
    }));
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    const payload = {
      teamName: form.teamName,
      abbreviation: form.abbreviation,
      teamTag: form.teamTag.trim().toUpperCase(),
      region: form.region,
      website: form.website,
      socialLink: form.socialLink,
      roster: form.roster.map((slot, index) => ({
        playerId: slot.player?.playerId ?? null,
        role: slot.role,
        isSubstitute: index >= 3,
      })),
      eligibilityAccepted: form.eligibilityAccepted,
      rosterLockAccepted: form.rosterLockAccepted,
      rulesAccepted: form.rulesAccepted,
    };
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as SubmitResult;
    setSubmitting(false);
    if (!response.ok) {
      setError(result.message ?? "Registration could not be submitted.");
      return;
    }
    const teamId = result.teamId ?? result.id;
    const params = new URLSearchParams();
    if (teamId) params.set("team", teamId);
    if (result.status) params.set("status", result.status);
    router.push(`/dashboard/team${params.size ? `?${params.toString()}` : ""}`);
    router.refresh();
  }

  const startersFilled = form.roster.slice(0, 3).every((slot) => slot.player?.playerId);
  const rosterIdsUnique = new Set(selectedIds).size === selectedIds.length;
  const teamTagValid = /^[A-Z0-9]{3,4}$/.test(form.teamTag.trim().toUpperCase());

  const canContinue =
    (step !== 0 || Boolean(form.teamName && form.abbreviation && teamTagValid && manager)) &&
    (step !== 1 || (startersFilled && rosterIdsUnique && allSelectedVerified && !verificationLoading)) &&
    (step !== 2 || (eligible && form.eligibilityAccepted && form.rosterLockAccepted)) &&
    (step !== 4 || form.rulesAccepted);

  return (
    <div className="wizard">
      <div className="wizard-steps">
        {steps.map((label, index) => (
          <button
            type="button"
            className={`wizard-step ${index === step ? "active" : ""}`}
            onClick={() => index < step && setStep(index)}
            key={label}
          >
            0{index + 1} · {label}
          </button>
        ))}
      </div>
      <div className="card">
        <StatusBadge status={`Step ${step + 1} of 5`} />
        <h3>{steps[step]}</h3>
        <p>
          You are the team manager and Player 1 on the roster. Pick two more starters and up to two
          substitutes from registered ALCL players. Every roster player must verify rank with your
          team Tag before you submit.
        </p>

        {managerError ? (
          <p role="alert" className="legal">
            {managerError} <Link href="/login?next=/dashboard/team/create">Sign in</Link>
          </p>
        ) : null}

        {step === 0 ? (
          <div className="form">
            <div className="card card-accent">
              <small>TEAM MANAGER</small>
              <h3>{manager?.displayName ?? "Loading your player account…"}</h3>
              <p>{manager?.email ?? "Sign in as a player to create a team."}</p>
              <p className="legal">You are Player 1 on the roster and control registration, roster, and lineup changes.</p>
            </div>
            <div className="grid grid-2">
              <Field label="Team Name" value={form.teamName} onChange={(value) => setForm({ ...form, teamName: value })} />
              <Field label="Abbreviation" value={form.abbreviation} maxLength={5} onChange={(value) => setForm({ ...form, abbreviation: value.toUpperCase() })} />
              <Field
                label="Team Apex Tag"
                value={form.teamTag}
                maxLength={4}
                onChange={(value) =>
                  setForm({
                    ...form,
                    teamTag: value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                  })
                }
              />
              <Select label="Region" value={form.region} options={["North America", "Europe", "Oceania", "Asia Pacific"]} onChange={(value) => setForm({ ...form, region: value })} />
              <Field label="Website (Optional)" value={form.website} onChange={(value) => setForm({ ...form, website: value })} />
              <Field label="Social Link (Optional)" value={form.socialLink} onChange={(value) => setForm({ ...form, socialLink: value })} />
            </div>
            <p className="legal">
              Choose a 3-4 character Tag every roster player will set in Apex (Friends → Tag). ALCL
              verifies rank from their account - no manual rank entry.
            </p>
            {!teamTagValid && form.teamTag.trim().length > 0 ? (
              <p role="alert" className="legal">Team Tag must be 3-4 letters or numbers.</p>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="form">
            <div className="card card-accent">
              <small>TEAM TAG</small>
              <h3>{form.teamTag.trim().toUpperCase() || "Not set"}</h3>
              <p>Each player must set this Tag in Apex, then verify rank on their dashboard.</p>
            </div>
            {form.roster.map((slot, index) => {
              const playerId = slot.player?.playerId;
              const status = playerId ? verificationById.get(playerId) : null;
              return (
                <div className="card" key={index}>
                  <strong>
                    {index === 0
                      ? "Player 1 · Team Manager (You)"
                      : index < 3
                        ? `Player ${index + 1} · Starter`
                        : `Substitute ${index - 2} (Optional)`}
                  </strong>
                  <div className="grid grid-2" style={{ marginTop: 12 }}>
                    {index === 0 ? (
                      <label className="field">
                        Registered Player
                        <input
                          className="input"
                          readOnly
                          value={slot.player?.displayName ?? "Loading your player account…"}
                        />
                      </label>
                    ) : (
                      <PlayerSlotPicker
                        label="Registered Player"
                        value={slot.player}
                        required={index < 3}
                        excludeIds={selectedIds.filter((id) => id !== slot.player?.playerId)}
                        onChange={(player) => updateSlot(index, { player })}
                      />
                    )}
                    <Select
                      label="Role"
                      value={slot.role}
                      options={["IGL", "Fragger", "Support", "Flex", "Substitute"]}
                      onChange={(value) => updateSlot(index, { role: value as RosterSlot["role"] })}
                    />
                  </div>
                  {playerId ? (
                    <div style={{ marginTop: 12 }}>
                      {status?.verified ? (
                        <p className="legal" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <ShieldCheck size={16} color="var(--lime)" />
                          Verified Rank: <strong>{status.rank}</strong> · Tag {status.apexTag}
                        </p>
                      ) : (
                        <p role="alert" className="legal">
                          {status?.message ??
                            "Set the team Tag in Apex and verify rank on the player dashboard."}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!rosterIdsUnique ? (
              <p role="alert" className="legal">Each roster slot must be a different registered player.</p>
            ) : null}
            {verificationLoading ? <p className="legal">Checking verified ranks…</p> : null}
            {!allSelectedVerified && selectedIds.length > 0 && !verificationLoading ? (
              <p role="alert" className="legal">
                Every selected player must verify rank with team Tag{" "}
                <strong>{form.teamTag.trim().toUpperCase()}</strong> before you continue.
              </p>
            ) : null}
            <p className="legal">
              The manager is always Player 1. Starters are Players 1–3; substitutes fill slots 4–5.
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form">
            <div className="card">
              <strong>{eligible ? "Roster Currently Eligible" : "Roster Needs Changes"}</strong>
              <p>Maximum one Predator across the roster. Current Predator count: {predatorCount}.</p>
              {!allSelectedVerified ? (
                <p>Every roster player must have a verified rank tied to team Tag {form.teamTag.trim().toUpperCase()}.</p>
              ) : null}
            </div>
            <Check checked={form.eligibilityAccepted} onChange={(value) => setForm({ ...form, eligibilityAccepted: value })}>
              I confirm every selected player meets the published event eligibility rules.
            </Check>
            <Check checked={form.rosterLockAccepted} onChange={(value) => setForm({ ...form, rosterLockAccepted: value })}>
              I understand roster changes after the deadline require organizer approval.
            </Check>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid grid-2">
            <div className="card"><small>TEAM</small><h3>{form.teamName} · {form.abbreviation}</h3><p>{form.region}</p></div>
            <div className="card"><small>TEAM TAG</small><h3>{form.teamTag.trim().toUpperCase()}</h3><p>Shared Apex Tag for this roster</p></div>
            <div className="card"><small>MANAGER</small><h3>{manager?.displayName ?? "-"}</h3><p>{manager?.email ?? "Your player account"}</p></div>
            <div className="card"><small>ROSTER PLAYERS</small><h3>{selectedIds.length} registered players</h3><p>{predatorCount} Predator · all ranks verified</p></div>
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              {form.roster.filter((slot) => slot.player).map((slot, slotIndex) => {
                const status = slot.player ? verificationById.get(slot.player.playerId) : null;
                return (
                  <p key={slot.player!.playerId}>
                    {slotIndex === 0
                      ? "Player 1 (manager)"
                      : slotIndex < 3
                        ? `Player ${slotIndex + 1}`
                        : `Sub ${slotIndex - 2}`}
                    : {slot.player!.displayName} · {slot.role} · {status?.rank ?? "Unverified"}
                  </p>
                );
              })}
            </div>
            <div className="card" style={{ gridColumn: "1 / -1" }}><ShieldCheck color="var(--lime)" /><p>Verified ranks are pulled from Apex and snapshotted at registration.</p></div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="form">
            <div className="card">
              <strong>Create Team</strong>
              <p>You will remain the team manager. Roster ranks refresh one last time when you submit.</p>
            </div>
            <Check checked={form.rulesAccepted} onChange={(value) => setForm({ ...form, rulesAccepted: value })}>
              I accept the published event rules and terms of participation.
            </Check>
            {error ? <p role="alert" className="legal">{error}</p> : null}
          </div>
        ) : null}

        <div className="actions">
          {step > 0 ? <button className="btn" type="button" onClick={() => setStep(step - 1)}><ChevronLeft size={14} /> Back</button> : <span />}
          {step < 4 ? (
            <button className="btn btn-primary" disabled={!canContinue} type="button" onClick={() => setStep(step + 1)}>Continue <ChevronRight size={14} /></button>
          ) : (
            <button className="btn btn-primary" disabled={!canContinue || submitting} type="button" onClick={submit}>{submitting ? "Creating Team…" : "Create Team"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", maxLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; maxLength?: number }) {
  return <label className="field">{label}<input className="input" type={type} value={value} maxLength={maxLength} required onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="field">{label}<select className="input" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return <label style={{ display: "flex", gap: 10, color: "var(--muted)" }}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{children}</label>;
}
