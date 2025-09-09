import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const search = request.nextUrl.search || "";
  const res = await fetch(`${SERVER_URL}/api/admin/reports/pending${search}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({ message: "Failed to load" }));
  return NextResponse.json(data, { status: res.status });
}
