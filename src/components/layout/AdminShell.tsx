"use client";

import * as React from "react";
import {
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { SidebarNav, type NavItem } from "@/components/layout/SidebarNav";
import { ThemeSegmented } from "@/components/layout/ThemeToggle";
import { Wordmark } from "@/components/layout/Wordmark";

/** The counts the nav shows, from `getAdminContext`. */
export type AdminNavCounts = {
  pendingApplications: number;
  openJobs: number;
};

/**
 * The admin shell. Replaces a single nav row that overflowed the viewport on
 * anything narrower than a laptop. Below `lg` the sidebar gives way to a
 * bottom tab bar, as in the tutor portal; the drawer keeps the account card.
 *
 * Logout stays a real form POST: `/api/admin/auth/logout` answers with a
 * redirect, not JSON, so it cannot be swapped for a fetch the way the tutor
 * logout can. It is deliberately kept out of a portaled dropdown, since
 * closing the menu can unmount the form before the submit dispatches.
 *
 * The badges come from the layout, which Next does not re-render on client
 * navigation: they refresh on a full load and after every admin action
 * (each one calls `router.refresh()`), not on every click between pages.
 */
function navItems(counts: AdminNavCounts): readonly NavItem[] {
  return [
    {
      href: "/admin",
      label: "Dashboard",
      shortLabel: "Home",
      icon: <LayoutDashboard />,
      exact: true,
    },
    {
      href: "/admin/applications",
      label: "Applications",
      icon: <FileText />,
      badge: {
        count: counts.pendingApplications,
        label: "new applications",
      },
    },
    {
      href: "/admin/jobs",
      label: "Jobs",
      icon: <BriefcaseBusiness />,
      badge: {
        count: counts.openJobs,
        label: "open jobs",
        tone: "muted",
      },
    },
    { href: "/admin/tutors", label: "Tutors", icon: <Users /> },
  ];
}

function AdminCard({
  admin,
}: {
  admin: { fullName: string; email: string };
}) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="truncate text-sm font-medium">{admin.fullName}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {admin.email}
      </p>

      <form action="/api/admin/auth/logout" method="POST" className="mt-3">
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <LogOut data-icon="inline-start" aria-hidden="true" />
          Log out
        </Button>
      </form>
    </div>
  );
}

export function AdminShell({
  admin,
  counts,
  children,
}: {
  admin: { fullName: string; email: string };
  counts: AdminNavCounts;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  const closeDrawer = React.useCallback(() => setOpen(false), []);

  const items = navItems(counts);

  return (
    <div className="flex min-h-svh w-full bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <div className="px-4 py-5">
          <Wordmark href="/admin" subtitle="Admin" />
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav items={items} />
        </div>

        <div className="space-y-3 p-3">
          <ThemeSegmented />
          <AdminCard admin={admin} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur-sm supports-backdrop-filter:bg-background/80 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon-lg" aria-label="Open menu" />
              }
            >
              <Menu />
            </SheetTrigger>

            <SheetContent side="left" className="w-[17rem] p-0">
              <SheetHeader className="px-4 py-4">
                <SheetTitle className="text-left">
                  <Wordmark href="/admin" subtitle="Admin" />
                </SheetTitle>
              </SheetHeader>

              <Separator />

              <div className="flex-1 overflow-y-auto p-3">
                <SidebarNav
                  items={items}
                  variant="drawer"
                  onNavigate={closeDrawer}
                />
              </div>

              <div className="space-y-3 border-t p-3">
                <ThemeSegmented />
                <AdminCard admin={admin} />
              </div>
            </SheetContent>
          </Sheet>

          <Wordmark href="/admin" />
        </header>

        <main className="flex-1">
          {/* `pb-28` clears the bottom tab bar on a phone. */}
          <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>

        <MobileTabBar items={items} />
      </div>
    </div>
  );
}
