import AdminReports from "@/app/components/reports/AdminReports";
import AdminNavbar from "@/app/components/common/AdminNavbar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SERVER_URL } from "@/lib/api";

export default async function Page() {
  const token = (await cookies()).get("cv_admin")?.value;
  if (!token) redirect("/login");

  const res = await fetch(`${SERVER_URL}/api/admin/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) redirect("/login");
  
  const data: { user?: { role?: string } } = await res
    .json()
    .catch(() => ({} as unknown as { user?: { role?: string } }));
  const role = data?.user?.role;
  
  // Only superadmin can access reports
  if (role !== "superadmin") redirect("/gallery");

  return (
    <>
      <AdminNavbar />
      <AdminReports />
    </>
  );
}
