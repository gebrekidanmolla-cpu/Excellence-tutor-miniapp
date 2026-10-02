"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Wordmark } from "@/components/layout/Wordmark";

/**
 * The public site header. The previous landing nav was `hidden md:flex` with
 * no hamburger, so on a phone the links simply did not exist.
 *
 * Section anchors are absolute (`/#how-it-works`) so they still work from
 * pages other than the landing page.
 *
 * `tutor` is optional: pass it from a page that already loads the session, so
 * a signed-in visitor is not invited to register again. Pages that stay static
 * (the landing page) simply omit it.
 */
const LINKS = [
  { href: "/jobs", label: "Find Jobs" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#why-us", label: "Why Us" },
  { href: "/#faq", label: "FAQ" },
];

export function PublicHeader({
  tutor,
}: {
  tutor?: { fullName: string } | null;
}) {
  const [open, setOpen] = React.useState(false);

  const closeDrawer = React.useCallback(() => setOpen(false), []);

  return (
    <header className="header-settle sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Wordmark />

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={link.href === "/jobs" ? false : undefined}
              className="rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {tutor ? (
            <Button render={<Link href="/tutor" prefetch={false} />} size="lg">
              Go to portal
            </Button>
          ) : (
            <>
              <Button
                render={<Link href="/login" />}
                variant="ghost"
                size="lg"
                className="hidden sm:inline-flex"
              >
                Log in
              </Button>

              <Button
                render={<Link href="/register" />}
                size="lg"
                className="hidden rounded-md bg-foreground px-4 text-background hover:bg-primary sm:inline-flex"
              >
                Register
              </Button>
            </>
          )}

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Open menu"
                  className="md:hidden"
                />
              }
            >
              <Menu />
            </SheetTrigger>

            <SheetContent side="right" className="w-[17rem] p-0">
              <SheetHeader className="px-4 py-4">
                <SheetTitle className="text-left">
                  <Wordmark />
                </SheetTitle>
              </SheetHeader>

              <Separator />

              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={link.href === "/jobs" ? false : undefined}
                    onClick={closeDrawer}
                    className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="grid gap-2 border-t p-3">
                {tutor ? (
                  <Button
                    render={<Link href="/tutor" prefetch={false} onClick={closeDrawer} />}
                    size="xl"
                  >
                    Go to portal
                  </Button>
                ) : (
                  <>
                    <Button
                      render={<Link href="/login" onClick={closeDrawer} />}
                      variant="outline"
                      size="xl"
                    >
                      Log in
                    </Button>

                    <Button
                      render={<Link href="/register" onClick={closeDrawer} />}
                      size="xl"
                    >
                      Register
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
