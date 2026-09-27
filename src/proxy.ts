import { NextResponse, type NextRequest } from "next/server";

import {
  getParentProfileOrigin,
  PROFILE_TOKEN_PATTERN,
  profileSharePath,
} from "@/lib/tutor-profile";

/**
 * Serves the parent subdomain (`PARENT_PROFILE_URL`, e.g.
 * `parent.excellencehometutor.com`) from this same deployment:
 *
 * - `/<token>` rewrites to `/tutor-profile/<token>`, so the link an admin
 *   sends is short and does not look like part of the main site.
 * - `/api/tutor-profile/...` passes through — the profile page loads its
 *   document images from there with relative URLs.
 * - Everything else redirects to the same path on the main site, so the
 *   subdomain never shows the tutor portal, admin or registration.
 *
 * Requests to any other host pass through untouched. With the env var
 * unset (local development) this does nothing at all.
 */
export function proxy(request: NextRequest) {
  const parentOrigin = getParentProfileOrigin();

  if (!parentOrigin) {
    return NextResponse.next();
  }

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  if (host !== parentOrigin.hostname.toLowerCase()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/tutor-profile/")) {
    return NextResponse.next();
  }

  const token = pathname.slice(1);

  if (PROFILE_TOKEN_PATTERN.test(token)) {
    return NextResponse.rewrite(
      new URL(profileSharePath(token), request.url)
    );
  }

  // The long form on the subdomain: send it to the short one.
  const longForm = pathname.match(/^\/tutor-profile\/([^/]+)$/);

  if (longForm && PROFILE_TOKEN_PATTERN.test(longForm[1])) {
    return NextResponse.redirect(new URL(`/${longForm[1]}`, parentOrigin));
  }

  const mainSite = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!mainSite) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(
    new URL(`${pathname}${request.nextUrl.search}`, mainSite)
  );
}

export const config = {
  // Static assets must load on the subdomain too (the profile page's own
  // CSS/JS), so they never reach the host check.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
