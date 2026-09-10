import type { Metadata } from "next";
import { AdminWorkspace } from "@/components/admin-workspace";
import { requireAdminAccess } from "@/server/route-guards";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminRoute({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section = [] } = await params;
  const query = await searchParams;
  const nextPath = `/admin${section.length ? `/${section.join("/")}` : ""}`;
  await requireAdminAccess(nextPath);
  return <AdminWorkspace section={section[0]} searchParams={query} />;
}
