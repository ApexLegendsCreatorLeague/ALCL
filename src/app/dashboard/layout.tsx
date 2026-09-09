import { createClient } from "@/lib/supabase/server";
import { ensurePlayerRecord } from "@/server/players";
import { requireDashboardAccess } from "@/server/route-guards";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDashboardAccess("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      await ensurePlayerRecord(supabase, user.id);
    } catch {
      // Player provisioning can be retried from the player profile page.
    }
  }

  return children;
}
