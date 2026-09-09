import type { Metadata } from "next";
import { RoutePage } from "@/components/pages";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardRoute({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section = [] } = await params;
  return <RoutePage segments={["dashboard", ...section]} />;
}
