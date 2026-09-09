import { redirectToMyPlayerProfile } from "@/server/my-player-profile";

export default async function MyPlayerProfileRedirect() {
  return redirectToMyPlayerProfile("/players/me");
}
