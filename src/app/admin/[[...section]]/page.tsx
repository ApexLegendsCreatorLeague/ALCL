import type { Metadata } from "next";
import { RoutePage } from "@/components/pages";
import { requireAdminAccess } from "@/server/route-guards";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminRoute({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section = [] } = await params;
  const nextPath = `/admin${section.length ? `/${section.join("/")}` : ""}`;
  await requireAdminAccess(nextPath);
  return <RoutePage segments={["admin", ...section]} />;
}
