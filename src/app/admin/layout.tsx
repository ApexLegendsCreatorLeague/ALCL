import { requireAdminAccess } from "@/server/route-guards";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminAccess("/admin");
  return children;
}
