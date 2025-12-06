import AdminApprovals from "@/app/components/admin/AdminApprovals";
import AdminNavbar from "@/app/components/common/AdminNavbar";
import { SERVER_URL } from "@/lib/api";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
  
  // Only superadmin can access pending approvals - regular admin goes to reports
  if (role === "admin") redirect("/reports");
  if (role !== "superadmin") redirect("/login");

  return (
    <>
      <AdminNavbar />
      <AdminApprovals />
    </>
  );
}
