"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormError } from "@/components/shared/ErrorState";
import { Wordmark } from "@/components/layout/Wordmark";

/**
 * Auth screens use a focused layout rather than `PublicHeader`: the header's
 * own Log in / Register buttons would be redundant here, and a single exit
 * route (the wordmark) keeps the page on task.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col lg:grid lg:grid-cols-2">
      {/* Brand panel — decorative, so it is dropped entirely on small screens
          rather than shrunk into a banner. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_0%,color-mix(in_oklch,var(--color-highlight)_22%,transparent),transparent_70%)]"
        />

        <div className="relative">
          <Link
            href="/"
            className="font-heading text-lg font-semibold tracking-tight"
          >
            Excellence Tutor
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="text-sm font-medium tracking-wide text-primary-foreground/70 uppercase">
            Tutor Portal
          </p>

          <h1 className="mt-4 font-heading text-4xl leading-tight font-semibold tracking-tight text-balance">
            Your next teaching opportunity starts here.
          </h1>

          <p className="mt-6 leading-relaxed text-primary-foreground/80 text-pretty">
            Sign in to explore available tutoring opportunities, manage your
            applications, and keep your tutor profile up to date.
          </p>
        </div>

        <p className="relative text-sm text-primary-foreground/60">
          Excellence Tutor Hub
        </p>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Wordmark />
          </div>

          <div className="mt-8 lg:mt-0">
            <p className="text-sm font-medium text-muted-foreground">
              Welcome back
            </p>

            <h2 className="mt-1.5 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Sign in to your account
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Access jobs and manage your tutoring applications.
            </p>
          </div>

          <Suspense fallback={null}>
            <RegisteredBanner />
          </Suspense>

          <LoginForm />

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have a tutor account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
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
  const [showRecoveryNote, setShowRecoveryNote] = useState(false);
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

      router.push("/tutor");
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

            {/* Previously this pushed a sentence through `setError`, so an
                unavailable feature was reported as a login failure. */}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-muted-foreground"
              aria-expanded={showRecoveryNote}
              onClick={() => setShowRecoveryNote((value) => !value)}
            >
              Forgot password?
            </Button>
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

          {showRecoveryNote ? (
            <Alert>
              <Info aria-hidden="true" />
              <AlertDescription>
                Password recovery is not available yet. It is planned for a
                later authentication milestone.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <Button type="submit" size="xl" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </>
  );
}
