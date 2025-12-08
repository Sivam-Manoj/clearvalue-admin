import { redirect } from "next/navigation";

export default function Page() {
  // Redirect to gallery - accessible to all roles
  // Dashboard will redirect non-superadmin to gallery anyway
  redirect("/gallery");
}
