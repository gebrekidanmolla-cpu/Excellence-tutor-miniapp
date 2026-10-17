"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* =========================================================
   FIELD SHELL
========================================================= */

function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>

      {children}

      {/* The error replaces the hint rather than stacking, so the field
          height stays stable as the user corrects it. */}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* =========================================================
   TEXT
========================================================= */

export const TextField = React.forwardRef<
  HTMLInputElement,
  {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    className?: string;
  } & Omit<React.ComponentProps<typeof Input>, "id" | "size">
>(function TextField(
  { id, label, required, hint, error, className, ...props },
  ref
) {
  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <Input
        id={id}
        ref={ref}
        size="xl"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        {...props}
      />
    </FieldShell>
  );
});

/* =========================================================
   TEXTAREA
========================================================= */

export function TextAreaField({
  id,
  label,
  required,
  hint,
  error,
  value,
  maxLength,
  className,
  ...props
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
} & React.ComponentProps<typeof Textarea>) {
  const used = typeof value === "string" ? value.length : 0;

  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <Textarea
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        {...props}
      />

      {maxLength ? (
        <p className="text-right text-xs text-muted-foreground tabular-nums">
          {used} / {maxLength}
        </p>
      ) : null}
    </FieldShell>
  );
}

/* =========================================================
   SELECT
========================================================= */

export function SelectField({
  id,
  label,
  required,
  hint,
  error,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <Select
        items={options as { value: string; label: string }[]}
        value={value || null}
        onValueChange={(next) => onValueChange((next as string) ?? "")}
      >
        <SelectTrigger
          id={id}
          size="xl"
          className="w-full"
          aria-invalid={Boolean(error) || undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

/* =========================================================
   PASSWORD
========================================================= */

export const PasswordField = React.forwardRef<
  HTMLInputElement,
  {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
  } & Omit<React.ComponentProps<typeof Input>, "id" | "size" | "type">
>(function PasswordField(
  { id, label, required, hint, error, ...props },
  ref
) {
  const [visible, setVisible] = React.useState(false);

  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
    >
      <div className="relative">
        <Input
          id={id}
          ref={ref}
          size="xl"
          type={visible ? "text" : "password"}
          className="pr-11"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          {...props}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
    </FieldShell>
  );
});

/* =========================================================
   SECTION HEADING
========================================================= */

export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1.5">
      <h2 className="font-heading text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground text-pretty">
        {description}
      </p>
    </div>
  );
}
