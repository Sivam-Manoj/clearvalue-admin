import AdminApprovals from "@/components/admin/AdminApprovals";
import AdminNavbar from "@/components/common/AdminNavbar";
import { SERVER_URL } from "@/lib/api";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const token = (await cookies()).get("cv_admin")?.value;
  if (!token) redirect("/dashboard");

  const res = await fetch(`${SERVER_URL}/api/admin/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) redirect("/dashboard");
  const data: { user?: { role?: string } } = await res
    .json()
    .catch(() => ({} as unknown as { user?: { role?: string } }));
  const role = data?.user?.role;
  if (role !== "admin" && role !== "superadmin") redirect("/dashboard");

  return (
    <>
      <AdminNavbar />
      <AdminApprovals />
    </>
  );
}
