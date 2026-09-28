import { redirect } from "next/navigation";

import { getCurrentTutor } from "@/lib/session";
import { PortalShell } from "@/components/layout/PortalShell";
import { tutorFileHref } from "@/lib/tutor-files";

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
    <PortalShell
      tutor={{
        fullName: tutor.fullName,
        email: tutor.email,
        photoUrl: tutorFileHref("photo", tutor.profilePhotoUrl),
      }}
    >
      {children}
    </PortalShell>
  );
}
