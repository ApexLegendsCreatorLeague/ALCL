import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/admin");

    const { data: roles } = await supabase
      .from("profile_roles")
      .select("role")
      .eq("profile_id", user.id)
      .in("role", ["organizer", "admin"]);
    if (!roles?.length) redirect("/dashboard");
  }

  return children;
}
