import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/check-email",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isPublic = PUBLIC_PATHS.has(pathname);

  // Unauthenticated user hitting a protected route → redirect to login
  if (!token && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting login/register → redirect to app
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/trips", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *  - _next/static (static files)
     *  - _next/image (image optimization)
     *  - favicon.ico
     *  - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
