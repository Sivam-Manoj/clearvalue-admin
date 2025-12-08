import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  // Get current user info to check role
  const meRes = await fetch(`${SERVER_URL}/api/admin/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const meData = await meRes.json().catch(() => ({}));
  const userRole = meData?.user?.role;
  const userEmail = meData?.user?.email;

  const url = new URL(request.url);
  
  // For regular users, filter to only their own reports
  if (userRole === "user" && userEmail) {
    url.searchParams.set("userEmail", userEmail);
  }
  
  const qs = url.search; // includes leading ? if any

  const res = await fetch(`${SERVER_URL}/api/admin/reports${qs}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
