"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search as SearchIcon } from "lucide-react";

import { PlayerCard, EmptyState } from "@/components/alcl";
import type { PublicPlayer } from "@/server/public-directory";

export function PlayersDirectory({ players }: { players: PublicPlayer[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return players;
    return players.filter((player) => {
      const haystack = [player.displayName, player.username, player.teamName, player.platform, player.rank]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [players, query]);

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <SearchIcon className="search-icon" size={17} />
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Players…"
            aria-label="Search Players"
          />
        </div>
      </div>
      {filtered.length ? (
        <div className="grid grid-3">
          {filtered.map((player) => (
            <PlayerCard
              key={player.playerId}
              playerId={player.playerId}
              name={player.displayName}
              teamName={player.teamName}
              platform={player.platform}
              rank={player.rank}
            />
          ))}
        </div>
      ) : players.length ? (
        <EmptyState
          title="No Players Match Your Search"
          message="Try a different name, team, platform, or rank."
        />
      ) : (
        <EmptyState
          title="No Players Listed Yet"
          message="Player profiles will appear here after accounts are created."
        />
      )}
      {filtered.length ? (
        <p className="legal directory-footnote">
          Click a card to open the full tournament profile
          <ChevronRight size={14} />
        </p>
      ) : null}
    </>
  );
}
