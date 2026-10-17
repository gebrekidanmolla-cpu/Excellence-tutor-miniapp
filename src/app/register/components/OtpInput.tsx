"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A one-time-code field drawn as separate digit boxes. Underneath it is a
 * single real `<input>` stretched invisibly over the boxes, so typing,
 * pasting the whole code, SMS/email autofill (`one-time-code`) and screen
 * readers all work exactly as they would on a plain text field.
 */
export function OtpInput({
  id,
  value,
  onChange,
  onKeyDown,
  length = 6,
  disabled,
  invalid,
  describedBy,
  label = "Verification code",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  label?: string;
}) {
  const [focused, setFocused] = React.useState(false);

  /* The box the next digit will land in; the last one once it is full. */
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className="relative w-full max-w-xs">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, "").slice(0, length))
        }
        onKeyDown={onKeyDown}
        onPaste={(event) => {
          // A pasted code replaces whatever is there. Left to the browser,
          // it would insert at the caret, and `maxLength` drops it silently
          // once the boxes are full — e.g. after a mistyped code.
          const pasted = event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, length);

          if (pasted) {
            event.preventDefault();
            onChange(pasted);
          }
        }}
        onFocus={(event) => {
          setFocused(true);
          // Keep the caret at the end so typing always fills the next box —
          // or, when every box is filled, select the lot so the next digit
          // starts the code over instead of being dropped by `maxLength`.
          const end = event.target.value.length;
          event.target.setSelectionRange(end >= length ? 0 : end, end);
        }}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 z-10 size-full cursor-text opacity-0 disabled:cursor-not-allowed"
      />

      <div aria-hidden="true" className="grid grid-cols-6 gap-2">
        {Array.from({ length }, (_, index) => {
          const digit = value[index];
          const active = focused && index === activeIndex;

          return (
            <div
              key={index}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border bg-card font-heading text-xl font-semibold tabular-nums transition-[border-color,box-shadow]",
                digit ? "border-primary/40" : "border-input",
                active && "border-ring ring-3 ring-ring/40",
                invalid && "border-destructive/60",
                disabled && "opacity-50"
              )}
            >
              {digit ??
                (active ? (
                  <span className="h-6 w-px animate-pulse bg-foreground" />
                ) : null)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
