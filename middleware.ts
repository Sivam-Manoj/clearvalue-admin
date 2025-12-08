import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "cv_admin";

function isAuthPath(pathname: string) {
  return pathname.startsWith("/login");
}

export async function middleware(request: NextRequest) {
  const { nextUrl, cookies } = request;
  const pathname = nextUrl.pathname;

  // Allow static assets
  if (pathname.endsWith(".png") || pathname.endsWith(".svg") || pathname.endsWith(".ico")) {
    return NextResponse.next();
  }

  const hasSession = Boolean(cookies.get(AUTH_COOKIE)?.value);
  const hasRefresh = Boolean(cookies.get("cv_admin_refresh")?.value);

  // If no access token but refresh exists, try to refresh silently
  if (!hasSession && hasRefresh && !isAuthPath(pathname)) {
    try {
      const url = new URL("/api/admin/refresh", request.url);
      const refreshRes = await fetch(url, { method: "POST", cache: "no-store" });
      if (refreshRes.ok) {
        const data = await refreshRes.json().catch(() => ({}));
        const accessToken = data?.accessToken as string | undefined;
        if (accessToken) {
          const resp = NextResponse.next();
          resp.cookies.set(AUTH_COOKIE, accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 30 * 60,
          });
          return resp;
        }
      }
    } catch {}
  }

  // Protect all non-auth pages (including "/")
  if (!hasSession && !isAuthPath(pathname)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/gallery", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|public|api).*)"],
};
