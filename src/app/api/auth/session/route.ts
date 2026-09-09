import { NextResponse } from "next/server";

import { getNavUser } from "@/server/auth/nav-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getNavUser();
  return NextResponse.json(
    { user },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
