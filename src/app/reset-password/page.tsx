import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, LockKeyhole, ShieldCheck, TimerOff, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthHeading, AuthLayout } from "@/components/layout/AuthLayout";
import { findTutorByResetToken } from "@/lib/password-reset";
import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

const HIGHLIGHTS = [
  { icon: LockKeyhole, text: "Pick something you don't use anywhere else" },
  { icon: UserCheck, text: "You'll be signed in straight away" },
  { icon: ShieldCheck, text: "Older reset links stop working" },
];

/**
 * The token is checked here, before the form renders, so an expired or used
 * link says so at once instead of after the tutor has typed a new password.
 * The API checks it again on submit — this is only the early answer.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const tutor = value ? await findTutorByResetToken(value) : null;

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="A fresh start for your account."
      description="Choose a new password and you'll be back to your tutoring jobs in no time."
      highlights={HIGHLIGHTS}
    >
      {tutor ? (
        <>
          <AuthHeading
            icon={KeyRound}
            title="Choose a new password"
            description={
              <>
                For{" "}
                <span className="font-medium break-all text-foreground">
                  {tutor.email}
                </span>
                . Use at least 8 characters.
              </>
            }
          />

          <ResetPasswordForm token={value} email={tutor.email} />
        </>
      ) : (
        <>
          <AuthHeading
            icon={TimerOff}
            tone="destructive"
            title="This link has expired"
            description="Reset links work for 30 minutes and only once. Request a new one and we'll email it right away."
          />

          <div className="mt-8 space-y-3">
            <Button
              size="xl"
              className="w-full"
              render={<Link href="/forgot-password" />}
            >
              Request a new link
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="w-full"
              render={<Link href="/login" />}
            >
              Back to sign in
            </Button>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
