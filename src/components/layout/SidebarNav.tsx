"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Match the pathname exactly. Use for index routes like `/tutor`, which
   *  would otherwise stay active on every child route. */
  exact?: boolean;
};

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Shows a tap registered while the page loads. Nav links don't prefetch —
 * every portal and admin page is dynamic, and prefetching one costs two
 * function invocations on each page view that shows the nav — so a tap waits
 * one round trip before the route's loading skeleton arrives.
 *
 * Fixed-size and always rendered, so toggling it never shifts the row. Must
 * sit inside the `<Link>` it reports on.
 */
export function NavPendingDot({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-1.5 shrink-0 rounded-full bg-current opacity-0 transition-opacity",
        pending && "animate-pulse opacity-100",
        className
      )}
    />
  );
}

/**
 * The nav list shared by the tutor and admin shells.
 *
 * `drawer` uses taller rows: it is the only nav on a phone, where a 40px row
 * is below a comfortable touch target.
 */
export function SidebarNav({
  items,
  variant = "sidebar",
  onNavigate,
  className,
}: {
  items: readonly NavItem[];
  variant?: "sidebar" | "drawer";
  /** Lets the drawer close itself when a link is followed. */
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
        const active = isNavItemActive(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&>svg]:size-4.5 [&>svg]:shrink-0",
              variant === "drawer" ? "py-3" : "py-2.5",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.icon}
            {item.label}
            <NavPendingDot className="ml-auto" />
          </Link>
        );
      })}
    </nav>
  );
}
