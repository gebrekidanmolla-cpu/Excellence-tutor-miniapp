"use client";

import * as React from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/shared/ErrorState";

/**
 * Replaces `window.confirm`, which cannot be styled, cannot explain a
 * consequence in more than one line, and is suppressible by the browser.
 *
 * `onConfirm` may be async: the dialog stays open and disabled while it runs,
 * closes on success, and surfaces the thrown message in place on failure —
 * so a failed request is no longer silent.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    // Never let the dialog vanish mid-request.
    if (pending) {
      return;
    }

    setOpen(nextOpen);

    if (!nextOpen) {
      setError(null);
    }
  }

  async function handleConfirm() {
    setPending(true);
    setError(null);

    try {
      await onConfirm();
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger as React.ReactElement} />

      <DialogContent showCloseButton={!pending}>
        {/* Clear of the close button: a long title ("Delete <full name>?")
            otherwise runs under it. */}
        <DialogHeader className="pr-6">
          <DialogTitle>{title}</DialogTitle>

          {description ? (
            // A <div>, not the default <p>: callers pass block content
            // (paragraphs, lists), which is invalid inside a <p>.
            <DialogDescription render={<div />}>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <FormError message={error} />

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={pending} />}
          >
            {cancelLabel}
          </DialogClose>

          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
