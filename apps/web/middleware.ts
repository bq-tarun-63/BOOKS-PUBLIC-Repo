import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const IS_PUBLIC_SERVER = process.env.IS_PUBLIC_SERVER === "true";

export async function middleware(request: NextRequest) {
  // ========== PUBLIC SERVER MODE ==========
  // Completely bypass all checks - allow everything through
  if (IS_PUBLIC_SERVER) {
    return NextResponse.next();
  }

  // ========== PRIVATE SERVER MODE ==========
  
  // 1️⃣ Skip checks for static/public/auth routes
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api/auth") ||
    request.nextUrl.pathname.startsWith("/api/cms") ||
    request.nextUrl.pathname.startsWith("/api/covers") ||
    request.nextUrl.pathname.startsWith("/api/github/webhook") ||
    request.nextUrl.pathname.startsWith("/static") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2️⃣ Direct redirect to /notes for all routes on private server
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/notes", request.url));
  }

  // 3️⃣ API authentication check
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const sessionToken =
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value;

    const userEmail = request.headers.get("x-user-email");

    if (!sessionToken && !userEmail) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 4️⃣ Default pass-through
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
