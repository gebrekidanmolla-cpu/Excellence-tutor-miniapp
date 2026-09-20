"use client";

import * as React from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Menu,
  UserRound,
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
import LogoutButton from "@/components/LogoutButton";
import { SidebarNav, type NavItem } from "@/components/layout/SidebarNav";
import { Wordmark } from "@/components/layout/Wordmark";

/**
 * The shell for everything a signed-in tutor sees.
 *
 * `/jobs` lives outside `/tutor` but is portal-only (its layout redirects to
 * `/login`) and is linked from this very nav, so it uses the same shell rather
 * than rendering with no chrome at all.
 *
 * Below `lg` the sidebar is replaced by a drawer. Previously the mobile header
 * held nothing but a logout button, which left Dashboard, Jobs and
 * Applications unreachable on a phone.
 */
const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/tutor",
    label: "Dashboard",
    icon: <LayoutDashboard />,
    exact: true,
  },
  { href: "/jobs", label: "Available Jobs", icon: <BriefcaseBusiness /> },
  { href: "/tutor/applications", label: "My Applications", icon: <FileText /> },
  { href: "/tutor/profile", label: "My Profile", icon: <UserRound /> },
];

function TutorCard({
  tutor,
}: {
  tutor: { fullName: string; email: string };
}) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="truncate text-sm font-medium">{tutor.fullName}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {tutor.email}
      </p>

      <div className="mt-3">
        <LogoutButton />
      </div>
    </div>
  );
}

export function PortalShell({
  tutor,
  children,
}: {
  tutor: { fullName: string; email: string };
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  const closeDrawer = React.useCallback(() => setOpen(false), []);

  return (
    <div className="flex min-h-svh w-full bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <div className="px-4 py-5">
          <Wordmark href="/tutor" subtitle="Tutor Portal" />
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav items={NAV_ITEMS} />

          <Separator className="my-3" />

          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ExternalLink className="size-4.5 shrink-0" />
            Back to website
          </Link>
        </div>

        <div className="p-3">
          <TutorCard tutor={tutor} />
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
                  <Wordmark href="/tutor" subtitle="Tutor Portal" />
                </SheetTitle>
              </SheetHeader>

              <Separator />

              <div className="flex-1 overflow-y-auto p-3">
                <SidebarNav
                  items={NAV_ITEMS}
                  variant="drawer"
                  onNavigate={closeDrawer}
                />

                <Separator className="my-3" />

                <Link
                  href="/"
                  onClick={closeDrawer}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ExternalLink className="size-4.5 shrink-0" />
                  Back to website
                </Link>
              </div>

              <div className="border-t p-3">
                <TutorCard tutor={tutor} />
              </div>
            </SheetContent>
          </Sheet>

          <Wordmark href="/tutor" />
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
