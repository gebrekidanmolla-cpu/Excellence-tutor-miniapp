import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTutor } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r bg-white lg:flex lg:flex-col">

          {/* Logo */}
          <div className="border-b px-6 py-6">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight"
            >
              Excellence Tutor
            </Link>

            <p className="mt-1 text-xs text-gray-500">
              Tutor Portal
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">

            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Portal
            </p>

            <div className="space-y-1">

              <Link
                href="/tutor"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-black"
              >
                Dashboard
              </Link>

              <Link
                href="/jobs"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-black"
              >
                Available Jobs
              </Link>

              <Link
                href="/tutor/applications"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-black"
              >
                My Applications
              </Link>

              <Link
                href="/tutor/profile"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-black"
              >
                My Profile
              </Link>

            </div>

            <p className="mb-3 mt-8 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Account
            </p>

            <Link
              href="/"
              className="block rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-black"
            >
              Back to Website
            </Link>

          </nav>

          {/* Tutor Information */}
          <div className="border-t p-4">

            <div className="rounded-2xl bg-gray-50 p-4">

              <p className="truncate text-sm font-semibold text-gray-900">
                {tutor.fullName}
              </p>

              <p className="mt-1 truncate text-xs text-gray-500">
                {tutor.email}
              </p>

              <div className="mt-4">
                <LogoutButton />
              </div>

            </div>

          </div>

        </aside>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Mobile Header */}
          <header className="border-b bg-white px-5 py-4 lg:hidden">

            <div className="flex items-center justify-between">

              <Link
                href="/"
                className="text-lg font-bold"
              >
                Excellence Tutor
              </Link>

              <LogoutButton />

            </div>

          </header>

          {/* Page Content */}
          <main className="flex-1">
            {children}
          </main>

        </div>

      </div>
    </div>
  );
}
