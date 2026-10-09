"use client";

import { useSyncExternalStore } from "react";

import {
  readResolvedTheme,
  readThemePreference,
  subscribeToTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

/**
 * The stored preference. `null` on the server and during hydration, where
 * it can't be known, so a toggle renders a neutral state until then rather
 * than a guess that would mismatch the HTML.
 */
export function useThemePreference(): ThemePreference | null {
  return useSyncExternalStore(subscribeToTheme, readThemePreference, () => null);
}

/** The theme on the page right now; light on the server. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeToTheme, readResolvedTheme, () => "light");
}
