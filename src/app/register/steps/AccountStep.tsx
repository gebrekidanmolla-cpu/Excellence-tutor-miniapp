"use client";

import { BadgeCheck, Loader2, MailCheck, Send } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField, TextField } from "@/components/shared/FormFields";
import { FormSection } from "@/app/register/components/FormSection";
import { OtpInput } from "@/app/register/components/OtpInput";
import { PasswordStrength } from "@/app/register/components/PasswordStrength";
import { normalizeEthiopianPhone } from "@/lib/phone";
import { NAME_MAX_LENGTH, type RegisterValues } from "@/app/register/schema";

export type EmailVerification = {
  verified: boolean;
  codeSent: boolean;
  code: string;
  sending: boolean;
  verifying: boolean;
  /** Why the last verify failed; empty when it didn't. */
  error: string;
  /** Seconds until "Resend code" is allowed again; 0 when it is. */
  resendIn: number;
  setCode: (code: string) => void;
  send: () => void;
  verify: (code?: string) => void;
  change: () => void;
};

function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function AccountStep({
  form,
  email: verification,
}: {
  form: UseFormReturn<RegisterValues>;
  email: EmailVerification;
}) {
  const { register, formState, setValue, control } = form;
  const errors = formState.errors;

  const emailField = register("email");
  const emailValue = useWatch({ control, name: "email" });
  const phoneValue = useWatch({ control, name: "phone" });
  const passwordValue = useWatch({ control, name: "password" });

  return (
    <div className="space-y-10">
      <FormSection title="Your details">
        <TextField
          id="fullName"
          label="Full name"
          required
          placeholder="e.g. Abebe Kebede"
          autoComplete="name"
          maxLength={NAME_MAX_LENGTH}
          hint="Your first and last name."
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        {/* ---------------------------------------------------
            EMAIL + VERIFICATION
        --------------------------------------------------- */}
        <div className="space-y-2">
          <Label htmlFor={verification.verified ? undefined : "email"}>
            Email address
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </Label>

          {verification.verified ? (
            <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/[0.06] p-3">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground"
              >
                <BadgeCheck className="size-5" />
              </span>

              <p className="min-w-0 flex-1 text-sm">
                <span className="block truncate font-medium">
                  {emailValue}
                </span>
                <span className="block text-xs text-success">
                  Email verified
                </span>
              </p>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={verification.change}
                className="shrink-0 text-muted-foreground"
              >
                Change
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="email"
                  type="email"
                  size="xl"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(errors.email) || undefined}
                  aria-describedby={errors.email ? "email-error" : "email-hint"}
                  {...emailField}
                  onChange={(event) => {
                    emailField.onChange(event);
                    // A new address invalidates any code already sent.
                    verification.change();
                  }}
                  onKeyDown={(event) => {
                    // Enter here means "send the code", not "next step".
                    if (event.key === "Enter") {
                      event.preventDefault();
                      verification.send();
                    }
                  }}
                  className="sm:flex-1"
                />

                {/* The one action that unblocks this step, so it is a
                    solid primary button until a code is on its way. */}
                <Button
                  type="button"
                  size="xl"
                  variant={verification.codeSent ? "outline" : "default"}
                  onClick={verification.send}
                  /* Stays enabled on an empty field: clicking it shows the
                     email error, which is clearer than a greyed-out button. */
                  disabled={verification.sending || verification.resendIn > 0}
                  className="shrink-0 tabular-nums sm:min-w-36"
                >
                  {verification.sending ? (
                    <Loader2
                      className="animate-spin"
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                  ) : (
                    <Send data-icon="inline-start" aria-hidden="true" />
                  )}
                  {verification.sending
                    ? "Sending…"
                    : verification.resendIn > 0
                      ? `Resend in ${formatCountdown(verification.resendIn)}`
                      : verification.codeSent
                        ? "Resend code"
                        : "Send code"}
                </Button>
              </div>

              {errors.email ? (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              ) : (
                <p id="email-hint" className="text-xs text-muted-foreground">
                  We&apos;ll email you a 6-digit code to confirm this address
                  is yours. You need to verify it to continue.
                </p>
              )}

              {verification.codeSent ? (
                <div className="mt-3 space-y-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-5">
                  <div className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                    >
                      <MailCheck className="size-4.5" />
                    </span>

                    <p className="text-sm leading-relaxed text-pretty">
                      <span className="font-medium">Check your inbox.</span>{" "}
                      <span className="text-muted-foreground">
                        Enter the code we sent to{" "}
                        <span className="font-medium text-foreground">
                          {emailValue}
                        </span>
                        . It expires in 10 minutes — look in spam if it
                        hasn&apos;t arrived.
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <OtpInput
                      id="emailCode"
                      value={verification.code}
                      disabled={verification.verifying}
                      invalid={Boolean(verification.error)}
                      describedBy={
                        verification.error ? "emailCode-error" : undefined
                      }
                      onChange={(code) => {
                        verification.setCode(code);

                        // Typing or pasting the last digit submits it.
                        if (code.length === 6 && !verification.verifying) {
                          verification.verify(code);
                        }
                      }}
                      onKeyDown={(event) => {
                        // Enter would submit the whole wizard form.
                        if (event.key === "Enter") {
                          event.preventDefault();
                          verification.verify();
                        }
                      }}
                    />

                    <Button
                      type="button"
                      size="xl"
                      onClick={() => verification.verify()}
                      disabled={
                        verification.verifying || verification.code.length < 6
                      }
                      className="sm:min-w-28"
                    >
                      {verification.verifying ? (
                        <Loader2
                          className="animate-spin"
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                      ) : null}
                      {verification.verifying ? "Verifying…" : "Verify"}
                    </Button>
                  </div>

                  {verification.error ? (
                    <p
                      id="emailCode-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {verification.error}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* ---------------------------------------------------
            PHONE
        --------------------------------------------------- */}
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone number
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </Label>

          <div className="flex">
            <span className="inline-flex h-11 shrink-0 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
              +251
            </span>

            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              size="xl"
              maxLength={9}
              placeholder="912 345 678"
              value={phoneValue}
              onChange={(event) =>
                setValue(
                  "phone",
                  normalizeEthiopianPhone(event.target.value),
                  {
                    shouldValidate: formState.isSubmitted,
                    shouldDirty: true,
                  }
                )
              }
              onBlur={() => form.trigger("phone")}
              className="rounded-l-none tabular-nums"
              aria-invalid={Boolean(errors.phone) || undefined}
              aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
            />
          </div>

          {errors.phone ? (
            <p id="phone-error" className="text-sm text-destructive">
              {errors.phone.message}
            </p>
          ) : (
            <p id="phone-hint" className="text-xs text-muted-foreground">
              Enter the 9 digits after +251.
            </p>
          )}
        </div>
      </FormSection>

      <FormSection
        title="Create a password"
        description="You'll use your email and this password to sign in."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <PasswordField
              id="password"
              label="Password"
              required
              autoComplete="new-password"
              error={errors.password?.message}
              {...register("password")}
            />

            {errors.password ? null : (
              <PasswordStrength password={passwordValue ?? ""} />
            )}
          </div>

          <PasswordField
            id="confirmPassword"
            label="Confirm password"
            required
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>
      </FormSection>
    </div>
  );
}
