"use client";

import * as React from "react";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Paperclip,
  Upload,
  X,
} from "lucide-react";

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
   FILE UPLOAD
========================================================= */

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * The input stays a real `<input type="file">` behind an `sr-only` class: it
 * remains keyboard focusable and announces normally, while the label provides
 * the drop-zone styling. The focus ring is driven by `focus-within`, since the
 * input itself is visually hidden.
 */
export function FileUploadField({
  id,
  label,
  hint,
  accept,
  file,
  error,
  required,
  busy,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  error?: string;
  required?: boolean;
  /** The picked file is still being compressed — see `compress-image.ts`. */
  busy?: boolean;
  onChange: (file: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function clear() {
    onChange(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "rounded-xl border border-dashed p-4 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          error
            ? "border-destructive/50 bg-destructive/5"
            : file
              ? "border-success/40 bg-success/5"
              : "border-input hover:border-ring/60 hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4.5",
              file
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            )}
          >
            {busy ? (
              <Loader2 className="animate-spin" />
            ) : file ? (
              <Check />
            ) : (
              <Upload />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <label
              htmlFor={id}
              className="cursor-pointer text-sm font-medium"
            >
              {label}
              {required ? (
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              ) : null}
            </label>

            {busy ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Preparing image…
              </p>
            ) : file ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0">· {formatSize(file.size)}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
            )}
          </div>

          {file ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={clear}
              disabled={busy}
              aria-label={`Remove ${label}`}
              className="shrink-0 text-muted-foreground"
            >
              <X />
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="shrink-0"
              tabIndex={-1}
            >
              Choose
            </Button>
          )}
        </div>

        <input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={busy}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

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
