import type { Metadata } from "next";
import { RoutePage } from "@/components/pages";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminRoute({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section = [] } = await params;
  return <RoutePage segments={["admin", ...section]} />;
}
