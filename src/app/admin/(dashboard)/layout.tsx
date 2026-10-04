import { requireAdmin } from "@/lib/admin-context";
import { AdminShell } from "@/components/layout/AdminShell";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // One statement: the admin plus the nav's counts (see `getAdminContext`).
  // Pages call `requireAdmin()` too; on a full load that is memoized.
  const { admin, counts } = await requireAdmin();

  return (
    <AdminShell
      admin={{ fullName: admin.fullName, email: admin.email }}
      counts={{
        pendingApplications: counts.pendingApplications,
        openJobs: counts.openJobs,
      }}
    >
      {children}
    </AdminShell>
  );
}
