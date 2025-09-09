import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";

function setAccessCookie(resp: NextResponse, token: string) {
  resp.cookies.set("cv_admin", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });
}

async function tryRefresh(request: NextRequest): Promise<string | null> {
  try {
    const url = new URL("/api/admin/refresh", request.url);
    const res = await fetch(url, { method: "POST", cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return (data?.accessToken as string) || null;
  } catch {
    return null;
  }
}

export async function proxyJsonWithAdminAuth(
  request: NextRequest,
  targetPath: string,
  init: { method?: string; headers?: Record<string, string>; body?: BodyInit | undefined } = {}
) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const headers: Record<string, string> = {
    ...(init.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`${SERVER_URL}${targetPath}`, {
    method: init.method || "GET",
    headers,
    body: init.body,
    cache: "no-store",
  });

  if (res.status !== 401) {
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }

  // Attempt refresh
  const newToken = await tryRefresh(request);
  if (!newToken) {
    const data = await res.json().catch(() => ({ message: "Unauthorized" }));
    return NextResponse.json(data, { status: 401 });
  }

  const retried = await fetch(`${SERVER_URL}${targetPath}`, {
    method: init.method || "GET",
    headers: { ...(init.headers || {}), Authorization: `Bearer ${newToken}` },
    body: init.body,
    cache: "no-store",
  });

  if (retried.status === 204) {
    const response = new NextResponse(null, { status: 204 });
    setAccessCookie(response, newToken);
    return response;
  }
  const data = await retried.json().catch(() => ({}));
  const response = NextResponse.json(data, { status: retried.status });
  setAccessCookie(response, newToken);
  return response;
}

export async function proxyStreamWithAdminAuth(
  request: NextRequest,
  targetPath: string
) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const doFetch = (auth: string) =>
    fetch(`${SERVER_URL}${targetPath}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${auth}` },
      cache: "no-store",
    });

  let res = await doFetch(token);
  if (res.status === 401) {
    const newToken = await tryRefresh(request);
    if (!newToken) {
      const err = await res.json().catch(() => ({ message: "Unauthorized" }));
      return NextResponse.json(err, { status: 401 });
    }
    res = await doFetch(newToken);
    const buffer = await res.arrayBuffer();
    const headers = new Headers();
    const ct = res.headers.get("content-type") || "application/octet-stream";
    const cd = res.headers.get("content-disposition");
    headers.set("content-type", ct);
    if (cd) headers.set("content-disposition", cd);
    const response = new NextResponse(buffer, { status: res.status, headers });
    setAccessCookie(response, newToken);
    return response;
  }

  const buffer = await res.arrayBuffer();
  const headers = new Headers();
  const ct = res.headers.get("content-type") || "application/octet-stream";
  const cd = res.headers.get("content-disposition");
  headers.set("content-type", ct);
  if (cd) headers.set("content-disposition", cd);
  return new NextResponse(buffer, { status: res.status, headers });
}
