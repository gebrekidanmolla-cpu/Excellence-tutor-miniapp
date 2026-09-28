"use client";

import * as React from "react";
import { Check, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type Choice = {
  value: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
};

/**
 * A single-choice question rendered as native radio inputs, so arrow keys,
 * screen-reader announcements and form focus all behave as the platform
 * expects. Replaces dropdowns for short option lists: every choice is visible
 * and one tap selects it.
 *
 * - `card`: large tiles with an optional icon and description.
 * - `chip`: compact segmented buttons for short labels.
 */
export function ChoiceGroup({
  name,
  legend,
  required,
  hint,
  error,
  options,
  value,
  onChange,
  variant = "chip",
  inputRef,
  className,
}: {
  name: string;
  legend: string;
  required?: boolean;
  hint?: string;
  error?: string;
  options: readonly Choice[];
  value: string;
  onChange: (value: string) => void;
  variant?: "card" | "chip";
  /** Lets react-hook-form focus the group when it has an error. */
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
}) {
  const messageId = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <fieldset
      className={cn("min-w-0 space-y-2.5", className)}
      aria-describedby={messageId}
    >
      <legend className="mb-2.5 text-sm font-medium">
        {legend}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            {" "}*
          </span>
        ) : null}
      </legend>

      <div
        className={cn(
          variant === "card"
            ? "grid gap-3 sm:grid-cols-2"
            : "flex flex-wrap gap-2"
        )}
      >
        {options.map((option, index) => {
          const Icon = option.icon;

          return (
            <label
              key={option.value}
              className={cn(
                "group relative flex cursor-pointer items-center border bg-background transition-[color,background-color,border-color,box-shadow] outline-none select-none",
                "hover:border-primary/40 hover:bg-primary/[0.03]",
                "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-1 has-[:checked]:ring-primary",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                error && "border-destructive/60",
                variant === "card"
                  ? "gap-3.5 rounded-xl p-4"
                  : "h-11 min-w-16 justify-center rounded-lg px-4 text-sm font-medium has-[:checked]:text-primary"
              )}
            >
              <input
                ref={index === 0 ? inputRef : undefined}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />

              {variant === "card" ? (
                <>
                  {Icon ? (
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-has-[:checked]:bg-primary group-has-[:checked]:text-primary-foreground"
                    >
                      <Icon className="size-5" />
                    </span>
                  ) : null}

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground text-pretty">
                        {option.description}
                      </span>
                    ) : null}
                  </span>

                  <span
                    aria-hidden="true"
                    className="flex size-5 shrink-0 items-center justify-center rounded-full border border-input transition-colors group-has-[:checked]:border-primary group-has-[:checked]:bg-primary group-has-[:checked]:text-primary-foreground"
                  >
                    <Check className="size-3 opacity-0 transition-opacity group-has-[:checked]:opacity-100" />
                  </span>
                </>
              ) : (
                option.label
              )}
            </label>
          );
        })}
      </div>

      {error ? (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}
