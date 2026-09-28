"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/shared/ErrorState";
import { PasswordField } from "@/components/shared/FormFields";
import { PasswordStrength } from "@/app/register/components/PasswordStrength";
import { passwordSchema } from "@/app/register/schema";

type FieldErrors = { password?: string; confirmPassword?: string };

export function ResetPasswordForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [linkExpired, setLinkExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const parsed = passwordSchema.safeParse(password);

    if (!parsed.success) {
      next.password = parsed.error.issues[0]?.message;
    }

    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your new password.";
    } else if (password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next = validate();
    setFieldErrors(next);
    setError("");

    if (next.password || next.confirmPassword) {
      document.getElementById(next.password ? "password" : "confirmPassword")?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (data?.code === "TOKEN_INVALID") {
          setLinkExpired(true);
        }

        if (data?.field === "password" || data?.field === "confirmPassword") {
          setFieldErrors({ [data.field]: data.message });
        } else {
          setError(data?.message || "Unable to reset your password.");
        }

        setLoading(false);
        return;
      }

      // Stays "loading" through the navigation so it can't be sent twice.
      toast.success("Password updated. Welcome back!");
      router.replace("/tutor");
      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <FormError message={error} className="mt-6" />

      {linkExpired ? (
        <Button
          size="xl"
          className="mt-4 w-full"
          render={<Link href="/forgot-password" />}
        >
          Request a new link
        </Button>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {/* Lets password managers file the new password under the account. */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={email}
          readOnly
          hidden
        />

        <div className="space-y-2">
          <PasswordField
            id="password"
            label="New password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((errors) => ({ ...errors, password: undefined }));
            }}
            error={fieldErrors.password}
          />

          {fieldErrors.password ? null : <PasswordStrength password={password} />}
        </div>

        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setFieldErrors((errors) => ({
              ...errors,
              confirmPassword: undefined,
            }));
          }}
          error={fieldErrors.confirmPassword}
        />

        <Button
          type="submit"
          size="xl"
          disabled={loading || linkExpired}
          className="w-full"
        >
          {loading ? (
            <Loader2
              className="animate-spin"
              data-icon="inline-start"
              aria-hidden="true"
            />
          ) : null}
          {loading ? "Updating password…" : "Update password and sign in"}
        </Button>
      </form>
    </>
  );
}
