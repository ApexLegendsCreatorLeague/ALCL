import { saveLiveApiBinding, verifyLiveApiDraft } from "@/app/admin/live-data/actions";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function LiveApiAdmin() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Live match data</h3>
        <p>
          Connect Supabase and apply the LiveAPI migration before starting the
          observer collector. No game or account credentials are collected.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("liveapi_sessions")
    .select("*")
    .order("last_event_at", { ascending: false })
    .limit(10);

  if (!sessions?.length) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Awaiting an observer connection</h3>
        <p>
          Start the read-only collector on the observer PC. A session appears
          here after its first signed event batch reaches ALCL.
        </p>
        <p>
          LiveAPI works in supported Apex custom matches. Configure JSON output
          and disable incoming game-control requests.
        </p>
      </div>
    );
  }

  return (
    <div className="grid" style={{ marginBottom: 16 }}>
      {await Promise.all(
        sessions.map(async (session) => {
          const [{ data: observedTeams }, { data: bindings }, { data: matchTeams }] =
            await Promise.all([
              supabase
                .from("liveapi_team_states")
                .select("*")
                .eq("session_id", session.id)
                .order("placement", { ascending: true, nullsFirst: false }),
              supabase
                .from("liveapi_team_bindings")
                .select("liveapi_team_key, team_id")
                .eq("session_id", session.id),
              supabase
                .from("match_teams")
                .select("team_id")
                .eq("match_id", session.match_id),
            ]);
          const eligibleIds = (matchTeams ?? []).map(({ team_id }) => team_id);
          const { data: eligibleTeams } = eligibleIds.length
            ? await supabase
                .from("teams")
                .select("id, name, short_name")
                .in("id", eligibleIds)
            : { data: [] };
          const bindingByKey = new Map(
            (bindings ?? []).map((binding) => [
              binding.liveapi_team_key,
              binding.team_id,
            ]),
          );

          return (
            <section className="card" key={session.id}>
              <div className="toolbar">
                <div>
                  <div className="eyebrow">Observer session</div>
                  <h3>{session.status.replaceAll("_", " ")}</h3>
                </div>
                <span className="badge">{session.raw_event_count} events</span>
              </div>
              <p>
                Match {session.match_id} · source {session.source_key} · last
                sequence {session.last_sequence}
              </p>
              {session.last_error ? <p className="legal">{session.last_error}</p> : null}
              <div className="grid grid-2">
                {(observedTeams ?? []).map((team) => (
                  <form action={saveLiveApiBinding} className="card" key={team.liveapi_team_key}>
                    <input name="sessionId" type="hidden" value={session.id} />
                    <input
                      name="liveApiTeamKey"
                      type="hidden"
                      value={team.liveapi_team_key}
                    />
                    <strong>
                      {team.team_name ?? `LiveAPI team ${team.liveapi_team_key}`}
                    </strong>
                    <p>
                      Placement {team.placement ?? "—"} · {team.kills} kills ·{" "}
                      {team.damage} damage
                    </p>
                    <label className="field">
                      ALCL team
                      <select
                        className="input"
                        defaultValue={bindingByKey.get(team.liveapi_team_key) ?? ""}
                        name="teamId"
                        required
                      >
                        <option value="">Select registered team</option>
                        {(eligibleTeams ?? []).map((eligible) => (
                          <option key={eligible.id} value={eligible.id}>
                            {eligible.name} ({eligible.short_name})
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="btn" type="submit">
                      Save binding
                    </button>
                  </form>
                ))}
              </div>
              {session.status === "ready_for_review" ? (
                <form action={verifyLiveApiDraft} className="actions">
                  <input name="sessionId" type="hidden" value={session.id} />
                  <button className="btn btn-primary" type="submit">
                    Verify and publish results
                  </button>
                </form>
              ) : null}
            </section>
          );
        }),
      )}
    </div>
  );
}
