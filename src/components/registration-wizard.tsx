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
  rank: "Platinum" | "Diamond" | "Master" | "Predator";
};

type TeamManager = {
  playerId: string;
  profileId: string;
  displayName: string;
  username: string | null;
  email: string | null;
};

const emptySlot = (): RosterSlot => ({
  player: null,
  role: "Flex",
  rank: "Diamond",
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
  const [form, setForm] = useState({
    teamName: "",
    abbreviation: "",
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

  const predatorCount = useMemo(
    () => form.roster.filter((slot) => slot.player && slot.rank === "Predator").length,
    [form.roster],
  );
  const eligible = predatorCount <= 1;

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
      region: form.region,
      website: form.website,
      socialLink: form.socialLink,
      roster: form.roster.map((slot, index) => ({
        playerId: slot.player?.playerId ?? null,
        role: slot.role,
        rank: slot.rank,
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

  const canContinue =
    (step !== 0 || Boolean(form.teamName && form.abbreviation && manager)) &&
    (step !== 1 || (startersFilled && rosterIdsUnique)) &&
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
          substitutes from registered ALCL players. Anyone not on ALCL yet must join at{" "}
          <Link href="/register">/register</Link> first.
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
              <Select label="Region" value={form.region} options={["North America", "Europe", "Oceania", "Asia Pacific"]} onChange={(value) => setForm({ ...form, region: value })} />
              <Field label="Website (Optional)" value={form.website} onChange={(value) => setForm({ ...form, website: value })} />
              <Field label="Social Link (Optional)" value={form.socialLink} onChange={(value) => setForm({ ...form, socialLink: value })} />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="form">
            {form.roster.map((slot, index) => (
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
                  <Select
                    label="Rank Snapshot"
                    value={slot.rank}
                    options={["Platinum", "Diamond", "Master", "Predator"]}
                    onChange={(value) => updateSlot(index, { rank: value as RosterSlot["rank"] })}
                  />
                </div>
              </div>
            ))}
            {!rosterIdsUnique ? (
              <p role="alert" className="legal">Each roster slot must be a different registered player.</p>
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
              <p>Maximum one Predator rank snapshot across the roster. Current count: {predatorCount}.</p>
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
            <div className="card"><small>MANAGER</small><h3>{manager?.displayName ?? "—"}</h3><p>{manager?.email ?? "Your player account"}</p></div>
            <div className="card"><small>ROSTER PLAYERS</small><h3>{selectedIds.length} registered players</h3><p>{predatorCount} Predator rank snapshot</p></div>
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              {form.roster.filter((slot) => slot.player).map((slot, slotIndex) => (
                <p key={slot.player!.playerId}>
                  {slotIndex === 0
                    ? "Player 1 (manager)"
                    : slotIndex < 3
                      ? `Player ${slotIndex + 1}`
                      : `Sub ${slotIndex - 2}`}
                  : {slot.player!.displayName} · {slot.role} · {slot.rank}
                </p>
              ))}
            </div>
            <div className="card" style={{ gridColumn: "1 / -1" }}><ShieldCheck color="var(--lime)" /><p>Roster players are accounts. The manager account controls the team.</p></div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="form">
            <div className="card">
              <strong>Create Team</strong>
              <p>You will remain the team manager. Roster players are linked as registered ALCL accounts.</p>
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
