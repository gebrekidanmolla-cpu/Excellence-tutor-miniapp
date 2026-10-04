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
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Wordmark } from "@/components/layout/Wordmark";
import { cn } from "@/lib/utils";

/**
 * The shell for everything a signed-in tutor sees.
 *
 * `/jobs` lives outside `/tutor` but is portal-only (its layout redirects to
 * `/login`) and is linked from this very nav, so it uses the same shell rather
 * than rendering with no chrome at all.
 *
 * Below `lg` the sidebar is replaced by a bottom tab bar (the four primary
 * destinations, one thumb away) plus a drawer that still carries everything,
 * including sign-out. The app is opened from Telegram links, so most tutors
 * are on a phone.
 */
const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/tutor",
    label: "Dashboard",
    shortLabel: "Home",
    icon: <LayoutDashboard />,
    exact: true,
  },
  {
    href: "/jobs",
    label: "Available Jobs",
    shortLabel: "Jobs",
    icon: <BriefcaseBusiness />,
  },
  {
    href: "/tutor/applications",
    label: "My Applications",
    shortLabel: "Applied",
    icon: <FileText />,
  },
  {
    href: "/tutor/profile",
    label: "My Profile",
    shortLabel: "Profile",
    icon: <UserRound />,
  },
];

function initialsOf(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();
}

type PortalTutor = {
  fullName: string;
  email: string;
  /** `/api/tutor/files/photo?v=…`, or null when the tutor has no photo. */
  photoUrl?: string | null;
};

function TutorAvatar({
  tutor,
  className,
}: {
  tutor: PortalTutor;
  className?: string;
}) {
  if (tutor.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a 302 to a presigned R2 URL
      <img
        src={tutor.photoUrl}
        alt=""
        className={cn("shrink-0 rounded-xl object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/70 text-xs font-semibold text-primary-foreground",
        className
      )}
    >
      {initialsOf(tutor.fullName)}
    </span>
  );
}

function TutorCard({ tutor }: { tutor: PortalTutor }) {
  return (
    <div className="rounded-2xl border bg-background p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <TutorAvatar tutor={tutor} className="size-9" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{tutor.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {tutor.email}
          </p>
        </div>
      </div>

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
  tutor: PortalTutor;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  const closeDrawer = React.useCallback(() => setOpen(false), []);

  return (
    <div className="flex min-h-svh w-full bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-68 shrink-0 border-r bg-sidebar/80 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
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
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-xl lg:hidden">
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

          <Link
            href="/tutor/profile" prefetch={false}
            aria-label="My profile"
            className="ml-auto rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <TutorAvatar tutor={tutor} className="size-8" />
          </Link>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>

        <MobileTabBar items={NAV_ITEMS} />
      </div>
    </div>
  );
}
