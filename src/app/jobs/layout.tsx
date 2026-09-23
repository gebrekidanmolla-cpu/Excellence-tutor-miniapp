import { redirect } from "next/navigation";

import { getCurrentTutor } from "@/lib/session";
import { PortalShell } from "@/components/layout/PortalShell";

/**
 * `/jobs` is signed-in-only and is linked from the portal nav, so it renders
 * inside the same shell as `/tutor/**` instead of with no chrome at all.
 */
export default async function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  return (
    <PortalShell tutor={{ fullName: tutor.fullName, email: tutor.email }}>
      {children}
    </PortalShell>
  );
}
