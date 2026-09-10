import { saveLiveApiBinding, verifyLiveApiDraft } from "@/app/admin/live-data/actions";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  buildTeamPlayerNameMaps,
  resolvePlayerIdForTeam,
} from "@/server/liveapi-player-match";

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function LiveApiAdmin() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="card">
        <h3>Live Match Data</h3>
        <p>
          Connect Supabase and apply the LiveAPI migration before starting the observer collector.
          No game or account credentials are collected.
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

  return (
    <div className="admin-stack">
      <section className="card">
        <div className="eyebrow">LiveAPI Pipeline</div>
        <h3>Real-Time Stat Tracking</h3>
        <p className="legal">
          Observer PC collector → signed ingest → live player/team states → team binding → draft
          results → verify → player profiles and standings. Tracked per player:{" "}
          <strong>kills</strong>, <strong>assists</strong>, <strong>knocks</strong>, and{" "}
          <strong>damage</strong>. Placement comes from team results.
        </p>
        <ul className="profile-facts" style={{ marginTop: 14 }}>
          <li>
            <span>1</span>
            <span>Collector posts to</span>
            <strong>/api/liveapi/events</strong>
          </li>
          <li>
            <span>2</span>
            <span>Bind each LiveAPI squad to an ALCL team</span>
            <strong>Required</strong>
          </li>
          <li>
            <span>3</span>
            <span>Player names must match ALCL display names</span>
            <strong>Roster</strong>
          </li>
          <li>
            <span>4</span>
            <span>Verify publishes stats to profiles</span>
            <strong>Final</strong>
          </li>
        </ul>
      </section>

      {!sessions?.length ? (
        <div className="card">
          <h3>Awaiting an Observer Connection</h3>
          <p>
            Start the read-only collector on the observer PC. A session appears here after its first
            signed event batch reaches ALCL.
          </p>
          <p className="legal">
            LiveAPI works in supported Apex custom matches. Configure JSON output and disable
            incoming game-control requests.
          </p>
        </div>
      ) : (
        await Promise.all(
          sessions.map(async (session) => {
            const [
              { data: observedTeams },
              { data: bindings },
              { data: matchTeams },
              { data: observedPlayers },
              { data: draftPlayerResults },
            ] = await Promise.all([
              supabase
                .from("liveapi_team_states")
                .select("*")
                .eq("session_id", session.id)
                .order("placement", { ascending: true, nullsFirst: false }),
              supabase
                .from("liveapi_team_bindings")
                .select("liveapi_team_key, team_id")
                .eq("session_id", session.id),
              supabase.from("match_teams").select("team_id").eq("match_id", session.match_id),
              supabase
                .from("liveapi_player_states")
                .select("*")
                .eq("session_id", session.id)
                .order("kills", { ascending: false }),
              supabase
                .from("match_player_results")
                .select("player_id, source_player_name, kills, assists, knocks, damage, verified_at")
                .eq("source_session_id", session.id),
            ]);

            const eligibleIds = (matchTeams ?? []).map(({ team_id }) => team_id);
            const { data: eligibleTeams } = eligibleIds.length
              ? await supabase
                  .from("teams")
                  .select("id, name, short_name")
                  .in("id", eligibleIds)
              : { data: [] };

            const bindingByKey = new Map(
              (bindings ?? []).map((binding) => [binding.liveapi_team_key, binding.team_id]),
            );
            const boundTeamIds = [...new Set((bindings ?? []).map(({ team_id }) => team_id))];
            const playerNameMaps = boundTeamIds.length
              ? await buildTeamPlayerNameMaps(supabase, session.match_id, boundTeamIds)
              : new Map();

            const teamNameByKey = new Map(
              (observedTeams ?? []).map((team) => [team.liveapi_team_key, team.team_name]),
            );
            const mappedDraftCount = (draftPlayerResults ?? []).filter((row) => row.player_id).length;
            const verifiedDraftCount = (draftPlayerResults ?? []).filter((row) => row.verified_at).length;

            return (
              <section className="card" key={session.id}>
                <div className="toolbar">
                  <div>
                    <div className="eyebrow">Observer Session</div>
                    <h3>{formatStatus(session.status)}</h3>
                  </div>
                  <span className="badge">{session.raw_event_count} events</span>
                </div>
                <p className="legal">
                  Match {session.match_id} · source {session.source_key} · last sequence{" "}
                  {session.last_sequence}
                  {draftPlayerResults?.length
                    ? ` · ${mappedDraftCount}/${draftPlayerResults.length} players linked to ALCL accounts`
                    : ""}
                  {verifiedDraftCount
                    ? ` · ${verifiedDraftCount} verified`
                    : ""}
                </p>
                {session.last_error ? <p className="legal">{session.last_error}</p> : null}

                <div className="grid grid-2">
                  {(observedTeams ?? []).map((team) => (
                    <form action={saveLiveApiBinding} className="card" key={team.liveapi_team_key}>
                      <input name="sessionId" type="hidden" value={session.id} />
                      <input name="liveApiTeamKey" type="hidden" value={team.liveapi_team_key} />
                      <strong>{team.team_name ?? `LiveAPI team ${team.liveapi_team_key}`}</strong>
                      <p className="legal">
                        Placement {team.placement ?? "-"} · {team.kills} K · {team.assists} A ·{" "}
                        {team.knocks} knocks · {team.damage} dmg
                      </p>
                      <label className="field">
                        ALCL Team
                        <select
                          className="input"
                          defaultValue={bindingByKey.get(team.liveapi_team_key) ?? ""}
                          name="teamId"
                          required
                        >
                          <option value="">Select Registered Team</option>
                          {(eligibleTeams ?? []).map((eligible) => (
                            <option key={eligible.id} value={eligible.id}>
                              {eligible.name} ({eligible.short_name})
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="btn" type="submit">
                        Save Binding
                      </button>
                    </form>
                  ))}
                </div>

                {(observedPlayers ?? []).length ? (
                  <div style={{ marginTop: 18 }}>
                    <div className="section-head" style={{ marginBottom: 12 }}>
                      <div>
                        <p className="eyebrow">Tracked Players</p>
                        <h3>Live Stat Snapshot</h3>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>In-Game Name</th>
                            <th>LiveAPI Team</th>
                            <th>K</th>
                            <th>A</th>
                            <th>Knocks</th>
                            <th>Damage</th>
                            <th>ALCL Link</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(observedPlayers ?? []).map((player) => {
                            const teamId = bindingByKey.get(player.liveapi_team_key) ?? null;
                            const linkedPlayerId = teamId
                              ? resolvePlayerIdForTeam(playerNameMaps, teamId, player.player_name)
                              : null;
                            return (
                              <tr key={`${player.liveapi_team_key}:${player.player_name}`}>
                                <td>
                                  <strong>{player.player_name}</strong>
                                </td>
                                <td>
                                  {teamNameByKey.get(player.liveapi_team_key) ??
                                    player.liveapi_team_key}
                                </td>
                                <td>{player.kills}</td>
                                <td>{player.assists}</td>
                                <td>{player.knocks}</td>
                                <td>{player.damage}</td>
                                <td>
                                  {linkedPlayerId ? (
                                    <span className="badge">Linked</span>
                                  ) : teamId ? (
                                    <span className="legal">No roster match</span>
                                  ) : (
                                    <span className="legal">Bind team first</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="legal" style={{ marginTop: 10 }}>
                      ALCL links when the in-game name matches a roster player&apos;s display name on
                      the bound team.
                    </p>
                  </div>
                ) : null}

                {session.status === "ready_for_review" ? (
                  <form action={verifyLiveApiDraft} className="actions">
                    <input name="sessionId" type="hidden" value={session.id} />
                    <button className="btn btn-primary" type="submit">
                      Verify and Publish Results
                    </button>
                  </form>
                ) : null}
              </section>
            );
          }),
        )
      )}
    </div>
  );
}
