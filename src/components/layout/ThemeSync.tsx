"use client";

import { useEffect, useLayoutEffect } from "react";

import {
  SCHEME_QUERIES,
  THEME_STORAGE_KEY,
  applyTheme,
  notifyThemeChange,
  readThemePreference,
} from "@/lib/theme";

/**
 * Keeps the theme applied after the first paint, which `THEME_INIT_SCRIPT`
 * handles. Rendered once, from the root layout, so it runs on every page,
 * including those without a toggle.
 *
 * - In development, Strict Mode's remount resets `<html>` to the attributes
 *   React manages, which drops the `dark` class the script set. The layout
 *   effect puts it back before paint. In production it changes nothing.
 * - On System, the page follows the OS theme the moment it changes.
 * - A choice made in another tab is followed here too.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme(readThemePreference());
    notifyThemeChange();
  }, []);

  useEffect(() => {
    const media = window.matchMedia(SCHEME_QUERIES.dark);

    function onSchemeChange() {
      if (readThemePreference() === "system") {
        applyTheme("system", { suppressTransitions: true });
        notifyThemeChange();
      }
    }

    function onStorage(event: StorageEvent) {
      // `key` is null when another tab clears storage outright.
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        applyTheme(readThemePreference(), { suppressTransitions: true });
        notifyThemeChange();
      }
    }

    media.addEventListener("change", onSchemeChange);
    window.addEventListener("storage", onStorage);

    return () => {
      media.removeEventListener("change", onSchemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
