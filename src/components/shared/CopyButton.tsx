"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Copy-to-clipboard with feedback that survives touch. The previous inline
 * version revealed "Copied" only on `:hover`, so on a phone the tap appeared
 * to do nothing — and a clipboard failure was swallowed into `console.error`.
 */
export function CopyButton({
  value,
  children,
  successMessage = "Copied to clipboard",
  variant = "outline",
  size = "default",
  className,
  ...props
}: {
  value: string;
  children?: React.ReactNode;
  successMessage?: string;
} & Omit<React.ComponentProps<typeof Button>, "onClick" | "value">) {
  const [copied, setCopied] = React.useState(false);
  const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);

      setCopied(true);
      toast.success(successMessage);

      if (timeout.current) {
        clearTimeout(timeout.current);
      }

      timeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — your browser blocked clipboard access.");
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      className={cn("max-w-full", className)}
      {...props}
    >
      {copied ? (
        <Check data-icon="inline-start" aria-hidden="true" />
      ) : (
        <Copy data-icon="inline-start" aria-hidden="true" />
      )}

      {children ? <span className="truncate">{children}</span> : null}

      <span className="sr-only">
        {copied ? "Copied" : `Copy ${children ? "" : value}`}
      </span>
    </Button>
  );
}
