import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Optional: setzt DASHBOARD_KEY in .env — dann Zugriff nur mit ?key=… oder eingeloggt. */

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard",
    "/((?!_next/|favicon.ico|manifest.json|icons/).+)",
  ],
};
