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
    <section className={cn("space-y-5", className)}>
      <div className="space-y-1">
        <h3 className="font-heading text-base font-semibold tracking-tight">
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
