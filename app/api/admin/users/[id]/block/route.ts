import { type NextRequest } from "next/server";
import { proxyJsonWithAdminAuth } from "@/lib/adminProxy";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return proxyJsonWithAdminAuth(request, `/api/admin/users/${id}/block`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
}
