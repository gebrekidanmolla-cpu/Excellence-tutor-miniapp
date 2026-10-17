import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The optional second address, shared by the register wizard and the admin
 * tutor edit form: a dashed "add" tile while it is off, and a card with a
 * remove button once it is on.
 */
export function AddAddressButton({
  onClick,
  description,
  className,
}: {
  onClick: () => void;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border-2 border-dashed p-4 text-left transition-colors outline-none hover:border-primary/50 hover:bg-primary/5 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
      >
        <Plus className="size-5" />
      </span>

      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-medium">
          Add another address
          <span className="font-normal text-muted-foreground"> · optional</span>
        </span>
        {description ? (
          <span className="block text-sm text-muted-foreground text-pretty">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function SecondAddressCard({
  onRemove,
  children,
  className,
}: {
  onRemove: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-muted/30 p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-heading text-sm font-medium">Second address</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          <X data-icon="inline-start" />
          Remove
        </Button>
      </div>

      {children}
    </div>
  );
}
