import { type NextRequest } from "next/server";
import { proxyJsonWithAdminAuth } from "@/lib/adminProxy";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return proxyJsonWithAdminAuth(request, `/api/crm/admin/leads/import`, {
    method: "POST",
    body: formData,
  });
}
