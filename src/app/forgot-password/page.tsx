"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  MailCheck,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/shared/ErrorState";
import { AuthHeading, AuthLayout } from "@/components/layout/AuthLayout";
import { IntentLink } from "@/components/shared/IntentLink";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side pause between resends, so an impatient tap doesn't queue five emails. */
const RESEND_COOLDOWN_SECONDS = 60;

const HIGHLIGHTS = [
  { icon: MailCheck, text: "We email a secure link to your inbox" },
  { icon: Timer, text: "The link works for 30 minutes, once" },
  { icon: ShieldCheck, text: "Your applications and profile stay as they are" },
];

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Locked out? We'll get you back in."
      description="Reset your password in a minute and pick up right where you left off."
      highlights={HIGHLIGHTS}
    >
      {/* `useSearchParams` opts out of prerendering; isolating it keeps the
          form itself in the static HTML. */}
      <Suspense fallback={<ForgotPasswordFlow defaultEmail="" />}>
        <PrefilledFlow />
      </Suspense>
    </AuthLayout>
  );
}

/** Carries over the address typed on the sign-in page, if any. */
function PrefilledFlow() {
  const email = useSearchParams().get("email") ?? "";

  return <ForgotPasswordFlow defaultEmail={email} />;
}

function ForgotPasswordFlow({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);

    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function requestLink(address: string) {
    const normalized = address.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalized)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.message || "Unable to send a reset link.");
        return;
      }

      setSentTo(normalized);
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestLink(email);
  }

  if (sentTo) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        <AuthHeading
          icon={MailCheck}
          tone="success"
          title="Check your email"
          description={
            <>
              If an account exists for{" "}
              <span className="font-medium break-all text-foreground">
                {sentTo}
              </span>
              , we&apos;ve sent a link to reset your password. It expires in
              30 minutes.
            </>
          }
        />

        <div className="mt-6 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Nothing in your inbox?</p>
          <p className="mt-1 leading-relaxed">
            Give it a minute, then look in your spam or promotions folder.
            Make sure it&apos;s the address you registered with.
          </p>
        </div>

        <FormError message={error} className="mt-6" />

        <div className="mt-8 space-y-3">
          <Button
            size="xl"
            className="w-full"
            render={<IntentLink href="/login" />}
          >
            Back to sign in
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xl"
            className="w-full tabular-nums"
            disabled={loading || resendIn > 0}
            onClick={() => void requestLink(sentTo)}
          >
            {loading ? (
              <Loader2
                className="animate-spin"
                data-icon="inline-start"
                aria-hidden="true"
              />
            ) : null}
            {loading
              ? "Sending…"
              : resendIn > 0
                ? `Resend link in ${resendIn}s`
                : "Resend link"}
          </Button>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Wrong address?{" "}
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setError("");
            }}
            className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Use a different email
          </button>
        </p>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        icon={KeyRound}
        title="Forgot your password?"
        description="Enter the email you registered with and we'll send you a link to choose a new one."
      />

      <FormError message={error} className="mt-6" />

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>

          <Input
            id="email"
            name="email"
            type="email"
            size="xl"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            aria-invalid={Boolean(error) || undefined}
          />
        </div>

        <Button type="submit" size="xl" disabled={loading} className="w-full">
          {loading ? (
            <Loader2
              className="animate-spin"
              data-icon="inline-start"
              aria-hidden="true"
            />
          ) : null}
          {loading ? "Sending link…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm">
        <IntentLink
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-sm font-medium text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to sign in
        </IntentLink>
      </p>
    </>
  );
}
