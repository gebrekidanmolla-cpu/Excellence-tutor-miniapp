import { redirect } from "next/navigation";

import { getCurrentTutor } from "@/lib/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { profileEditDefaults } from "@/lib/tutor-profile-edit";
import { ProfileEditForm } from "./ProfileEditForm";

export const metadata = {
  title: "Edit profile",
};

export default async function EditTutorProfilePage() {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Edit profile"
        description="Keep your contact details and introduction up to date."
        backHref="/tutor/profile"
        backLabel="My profile"
      />

      <ProfileEditForm defaultValues={profileEditDefaults(tutor)} />
    </div>
  );
}
