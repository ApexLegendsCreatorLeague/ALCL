import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoutePage } from "@/components/pages";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCompetitionManager, requireUser } from "@/server/auth";

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const label = slug.at(-1)?.replaceAll("-", " ") ?? "ALCL";
  return { title: label.replace(/\b\w/g, (letter) => letter.toUpperCase()) };
}

export default async function CatchAllPage({ params }: Props) {
  const { slug } = await params;
  if (isSupabaseConfigured()) {
    try {
      if (slug[0] === "admin") {
        await requireCompetitionManager();
      } else if (slug[0] === "dashboard") {
        await requireUser();
      }
    } catch {
      redirect(`/login?next=/${slug.join("/")}`);
    }
  }
  return <RoutePage segments={slug} />;
}
