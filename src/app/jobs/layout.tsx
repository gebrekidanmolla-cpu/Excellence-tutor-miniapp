import { redirect } from "next/navigation";
import { getCurrentTutor } from "@/lib/session";

export default async function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tutor = await getCurrentTutor();

  if (!tutor) {
    redirect("/login");
  }

  return children;
}