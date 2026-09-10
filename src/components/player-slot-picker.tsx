"use client";

import { useEffect, useState } from "react";

export type SelectedPlayer = {
  playerId: string;
  displayName: string;
  username: string | null;
};

type SearchResult = SelectedPlayer & {
  platform: string | null;
  rank: string | null;
};

export function PlayerSlotPicker({
  label,
  value,
  onChange,
  excludeIds = [],
  required = true,
}: {
  label: string;
  value: SelectedPlayer | null;
  onChange: (player: SelectedPlayer | null) => void;
  excludeIds?: string[];
  required?: boolean;
}) {
  const [query, setQuery] = useState(value?.displayName ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (value && query === value.displayName) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/players/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as { results?: SearchResult[] };
        setResults(
          (payload.results ?? []).filter((player) => !excludeIds.includes(player.playerId)),
        );
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, value, excludeIds]);

  return (
    <div className="field">
      <label>{label}</label>
      {value ? (
        <div className="card" style={{ padding: "12px 14px", marginBottom: 8 }}>
          <strong>{value.displayName}</strong>
          {value.username ? <span style={{ color: "var(--muted)", marginLeft: 8 }}>@{value.username}</span> : null}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginLeft: 12, minHeight: 32, padding: "0 10px" }}
            onClick={() => {
              onChange(null);
              setQuery("");
              setResults([]);
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Registered ALCL Players"
            required={required}
          />
          {searching ? <p className="legal">Searching players…</p> : null}
          {results.length > 0 ? (
            <div className="form" style={{ gap: 8 }}>
              {results.map((player) => (
                <button
                  type="button"
                  key={player.playerId}
                  className="card"
                  style={{ textAlign: "left", cursor: "pointer" }}
                  onClick={() => {
                    onChange({
                      playerId: player.playerId,
                      displayName: player.displayName,
                      username: player.username,
                    });
                    setQuery(player.displayName);
                    setResults([]);
                  }}
                >
                  <strong>{player.displayName}</strong>
                  {player.username ? (
                    <span style={{ color: "var(--muted)", marginLeft: 8 }}>@{player.username}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
          {query.trim().length >= 2 && !searching && results.length === 0 ? (
            <p className="legal">No registered player found. They must create an account at /register first.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
