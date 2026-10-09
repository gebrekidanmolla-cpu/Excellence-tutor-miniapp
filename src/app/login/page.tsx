"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  EyeOff,
  ListChecks,
  Loader2,
  LogIn,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormError } from "@/components/shared/ErrorState";
import { AuthHeading, AuthLayout } from "@/components/layout/AuthLayout";
import { nextPathFromLocation, safeNextPath } from "@/lib/safe-redirect";
import { IntentLink } from "@/components/shared/IntentLink";

const HIGHLIGHTS = [
  { icon: BriefcaseBusiness, text: "Browse tutoring jobs near you" },
  { icon: Send, text: "Apply to a job in a couple of taps" },
  { icon: ListChecks, text: "Track every application in one place" },
];

export default function LoginPage() {
  return (
    <AuthLayout
      eyebrow="Tutor Portal"
      title="Your next teaching opportunity starts here."
      description="Sign in to explore tutoring opportunities, manage your applications, and keep your tutor profile up to date."
      highlights={HIGHLIGHTS}
    >
      <AuthHeading
        icon={LogIn}
        title="Welcome back"
        description="Sign in to access jobs and manage your tutoring applications."
      />

      <Suspense fallback={null}>
        <RegisteredBanner />
      </Suspense>

      <LoginForm />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have a tutor account?{" "}
        <Suspense fallback={<RegisterLink href="/register" />}>
          <RegisterLinkWithNext />
        </Suspense>
      </p>
    </AuthLayout>
  );
}

function RegisterLink({ href }: { href: string }) {
  return (
    <IntentLink
      href={href}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      Create one
    </IntentLink>
  );
}

/** Keeps a `?next=` job link alive when the tutor needs an account first. */
function RegisterLinkWithNext() {
  const next = useSearchParams().get("next");
  const target = safeNextPath(next, "");

  return (
    <RegisterLink
      href={target ? `/register?next=${encodeURIComponent(target)}` : "/register"}
    />
  );
}

/**
 * Isolated so the form itself still prerenders. `useSearchParams` opts its
 * component out of static rendering; wrapping the whole form would ship a
 * skeleton where the form should be.
 */
function RegisteredBanner() {
  const justRegistered = useSearchParams().get("registered") === "1";

  if (!justRegistered) {
    return null;
  }

  return (
    <Alert className="mt-6 border-success/30 bg-success/5">
      <CheckCircle2 className="text-success" aria-hidden="true" />
      <AlertDescription className="text-foreground">
        Your account is ready. Sign in to continue.
      </AlertDescription>
    </Alert>
  );
}

function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed.");

        return;
      }

      // Back to the job they came from (`/apply/<code>?next=`), else home.
      router.push(nextPathFromLocation());
      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            aria-invalid={Boolean(error) || undefined}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>

            <IntentLink
              href={
                email.trim()
                  ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                  : "/forgot-password"
              }
              className="rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Forgot password?
            </IntentLink>
          </div>

          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              size="xl"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              className="pr-11"
              aria-invalid={Boolean(error) || undefined}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </div>

        <Button type="submit" size="xl" disabled={loading} className="w-full">
          {loading ? (
            <Loader2
              className="animate-spin"
              data-icon="inline-start"
              aria-hidden="true"
            />
          ) : null}
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </>
  );
}
