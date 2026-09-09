import { redirect } from "next/navigation";

import { DEFAULT_PLAYER_HOME } from "@/lib/auth/redirect-path";
import { getPlayerDashboard } from "@/server/player-dashboard";

export default async function DashboardPlayerRedirect() {
  try {
    const player = await getPlayerDashboard();
    redirect(`/players/${player.playerId}`);
  } catch {
    redirect(`/login?next=${encodeURIComponent(DEFAULT_PLAYER_HOME)}`);
  }
}
