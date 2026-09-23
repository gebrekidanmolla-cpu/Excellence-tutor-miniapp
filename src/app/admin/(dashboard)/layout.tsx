import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/lib/admin-session";
import { AdminShell } from "@/components/layout/AdminShell";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <AdminShell admin={{ fullName: admin.fullName, email: admin.email }}>
      {children}
    </AdminShell>
  );
}
