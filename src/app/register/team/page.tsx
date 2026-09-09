import { redirect } from "next/navigation";

export default function LegacyRegisterTeamPage() {
  redirect("/dashboard/team/create");
}
