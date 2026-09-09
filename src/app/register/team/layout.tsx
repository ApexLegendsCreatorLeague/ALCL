import { requireDashboardAccess } from "@/server/route-guards";

export default async function RegisterTeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardAccess("/dashboard/team/create");
  return children;
}
