import type { ReactNode } from "react";
import { unstable_noStore as noStore } from "next/cache";

import { ShellLayout } from "@/components/shell-layout";
import { getNavUser } from "@/server/auth/nav-user";

export const dynamic = "force-dynamic";

export async function AppShell({ children }: { children: ReactNode }) {
  noStore();
  const user = await getNavUser();
  return <ShellLayout user={user}>{children}</ShellLayout>;
}
