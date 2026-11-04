import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next =
    request.nextUrl.searchParams.get("next") === "/reset-password"
      ? "/reset-password"
      : "/dashboard";
  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    // Relative destinations preserve the browser origin (including 127.0.0.1)
    // instead of Next's internally normalized request URL.
    if (!error)
      return new NextResponse(null, {
        status: 307,
        headers: { Location: next },
      });
  }
  return new NextResponse(null, {
    status: 307,
    headers: { Location: "/login?error=invalidLink" },
  });
}
