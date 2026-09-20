"use client";

import { BadgeCheck, Loader2, Mail } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PasswordField,
  SectionHeading,
  TextField,
} from "@/components/shared/FormFields";
import {
  normalizeEthiopianPhone,
  type RegisterValues,
} from "@/app/register/schema";

export type EmailVerification = {
  verified: boolean;
  codeSent: boolean;
  code: string;
  sending: boolean;
  verifying: boolean;
  setCode: (code: string) => void;
  send: () => void;
  verify: () => void;
  change: () => void;
};

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

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Create your account"
        description="Create your account using an email you can access and an Ethiopian mobile number."
      />

      <TextField
        id="fullName"
        label="Full name"
        required
        placeholder="e.g. Abebe Kebede"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      {/* ---------------------------------------------------
          EMAIL + VERIFICATION
      --------------------------------------------------- */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email address
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        </Label>

        {verification.verified ? (
          <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex min-w-0 items-center gap-2 text-sm">
              <BadgeCheck
                className="size-4 shrink-0 text-success"
                aria-hidden="true"
              />
              <span className="truncate font-medium">{emailValue}</span>
              <span className="shrink-0 text-muted-foreground">verified</span>
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={verification.change}
              className="shrink-0"
            >
              Change email
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
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email) || undefined}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...emailField}
                onChange={(event) => {
                  emailField.onChange(event);
                  // A new address invalidates any code already sent.
                  verification.change();
                }}
              />

              <Button
                type="button"
                size="xl"
                variant="outline"
                onClick={verification.send}
                disabled={verification.sending || !emailValue}
                className="shrink-0"
              >
                {verification.sending ? (
                  <Loader2
                    className="animate-spin"
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                ) : (
                  <Mail data-icon="inline-start" aria-hidden="true" />
                )}
                {verification.codeSent ? "Resend code" : "Send code"}
              </Button>
            </div>

            {errors.email ? (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                We send a 6-digit code to confirm you can access this address.
              </p>
            )}

            {verification.codeSent ? (
              <div className="mt-3 space-y-3 rounded-xl border bg-muted/40 p-3">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code we sent to{" "}
                  <span className="font-medium text-foreground">
                    {emailValue}
                  </span>
                  .
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="emailCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    size="xl"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={verification.code}
                    onChange={(event) =>
                      verification.setCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    className="tracking-[0.3em]"
                  />

                  <Button
                    type="button"
                    size="xl"
                    onClick={verification.verify}
                    disabled={verification.verifying}
                    className="shrink-0"
                  >
                    {verification.verifying ? "Verifying…" : "Verify"}
                  </Button>
                </div>
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
          <span className="inline-flex h-11 shrink-0 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            +251
          </span>

          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            size="xl"
            maxLength={9}
            placeholder="912345678"
            value={phoneValue}
            onChange={(event) =>
              setValue("phone", normalizeEthiopianPhone(event.target.value), {
                shouldValidate: formState.isSubmitted,
                shouldDirty: true,
              })
            }
            onBlur={() => form.trigger("phone")}
            className="rounded-l-none"
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

      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordField
          id="password"
          label="Password"
          required
          hint="Minimum 8 characters."
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm password"
          required
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </div>

      {!verification.verified ? (
        <Alert>
          <Mail aria-hidden="true" />
          <AlertDescription>
            Your email must be verified before you can continue to the next
            step.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
