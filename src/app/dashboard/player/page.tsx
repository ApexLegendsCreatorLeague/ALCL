import { redirectToMyPlayerProfile } from "@/server/my-player-profile";

export default async function DashboardPlayerRedirect() {
  return redirectToMyPlayerProfile("/dashboard/player");
}
