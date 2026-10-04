"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import {
  NavCount,
  isNavItemActive,
  type NavItem,
} from "@/components/layout/SidebarNav";
import { cn } from "@/lib/utils";

/**
 * The tab's icon pill. It lights up while the tapped page loads, since the
 * tabs don't prefetch (see `NavPendingDot`). Must render inside the `<Link>`.
 */
function TabIcon({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      className={cn(
        "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
        (active || pending) && "bg-primary/10",
        pending && "animate-pulse"
      )}
    >
      {children}
    </span>
  );
}

/**
 * The phone nav for both portals: below `lg` the sidebar gives way to these
 * tabs, one thumb away, with the drawer kept for everything else (sign-out
 * included). A tab's badge sits on its icon, like a home-screen app's.
 */
export function MobileTabBar({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = isNavItemActive(pathname, item);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-colors focus-visible:outline-none [&_svg]:size-5",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <TabIcon active={active}>
                  {item.icon}
                  <NavCount
                    badge={item.badge}
                    className="absolute -top-1.5 left-1/2 ml-1.5 ring-2 ring-background"
                  />
                </TabIcon>
                {item.shortLabel ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
