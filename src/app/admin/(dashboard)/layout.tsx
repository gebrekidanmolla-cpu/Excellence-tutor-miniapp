import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-session";

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
    <div className="min-h-screen bg-gray-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/admin">
              <h1 className="text-xl font-bold">
                Excellence Tutor
              </h1>
            </Link>

            <p className="text-sm text-gray-500">
              Admin Dashboard
            </p>
          </div>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="/admin"
              className="transition hover:text-gray-600"
            >
              Dashboard
            </Link>

            <Link
              href="/admin/applications"
              className="transition hover:text-gray-600"
            >
              Applications
            </Link>

            <Link
              href="/admin/jobs"
              className="transition hover:text-gray-600"
            >
              Jobs
            </Link>
            <Link
                href="/admin/tutors"
                className="transition hover:text-gray-600"
                >
                Tutors
            </Link>

            <div className="flex items-center gap-4 border-l pl-6">
              <div className="hidden text-right sm:block">
                <p className="font-medium">
                  {admin.fullName}
                </p>

                <p className="text-xs text-gray-500">
                  {admin.email}
                </p>
              </div>

              <form
                action="/api/admin/auth/logout"
                method="POST"
              >
                <button
                  type="submit"
                  className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
                >
                  Logout
                </button>
              </form>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}