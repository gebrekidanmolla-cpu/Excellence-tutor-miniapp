import { cn } from "@/lib/utils";

/** A titled group of fields inside a wizard step. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        // Sections after the first are divided by a hairline, so a long
        // step reads as distinct groups rather than one column of fields.
        "space-y-5 not-first:border-t not-first:border-dashed not-first:pt-10",
        className
      )}
    >
      <div className="space-y-1">
        <h3 className="font-heading text-[0.9375rem] font-semibold tracking-tight">
          {title}
        </h3>
        {description ? (
          <p className="text-sm text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}
