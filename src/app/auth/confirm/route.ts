import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (
    token_hash &&
    (type === "email" || type === "signup" || type === "recovery")
  ) {
    const db = await createClient();
    const { error } = await db.auth.verifyOtp({ token_hash, type });
    if (!error)
      return new NextResponse(null, {
        status: 307,
        headers: {
          Location: type === "recovery" ? "/reset-password" : "/dashboard",
        },
      });
  }
  return new NextResponse(null, {
    status: 307,
    headers: { Location: "/login?error=invalidLink" },
  });
}
