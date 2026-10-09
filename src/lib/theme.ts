/**
 * Light, dark or system theme.
 *
 * The preference lives in `localStorage` and nowhere else: a cookie would
 * mean reading the request, and every prerendered page would turn dynamic.
 * `THEME_INIT_SCRIPT` applies it before the first paint, `ThemeSync` keeps
 * it applied after hydration, and the toggles call `setThemePreference`.
 *
 * No React in here, so the root layout (a server component) can import it.
 */

export const THEME_STORAGE_KEY = "theme";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** Dispatched on `window` after the applied theme may have changed. */
export const THEME_CHANGE_EVENT = "themechange";

export const SCHEME_QUERIES: Record<ResolvedTheme, string> = {
  light: "(prefers-color-scheme: light)",
  dark: "(prefers-color-scheme: dark)",
};

/**
 * The browser-chrome colors for `<meta name="theme-color">`: each theme's
 * `--background` in `globals.css`, as hex, which every browser reads there.
 * The root layout renders one meta per theme, keyed by `SCHEME_QUERIES`.
 */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#ffffff",
  dark: "#0c0f17",
};

/*
 * Inlined in `<head>`, so it runs before the body is parsed and the first
 * paint already has the right theme, prerendered pages included. It sets
 * `color-scheme` inline as well: the stylesheet does the same, but only once
 * it has loaded.
 *
 * A hand-picked theme switches the theme-color metas by their `media`
 * ("all" for the chosen one, "not all" for the other), never their
 * `content`: React matches a hoisted `<meta>` to its server-rendered element
 * by `content`, so a changed one would be left behind and duplicated. The
 * metas may not be parsed yet when this runs, hence the second pass.
 */
export const THEME_INIT_SCRIPT = `(function () {
  try {
    var p;
    try { p = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch (e) {}
    if (p !== "light" && p !== "dark") p = "system";
    var dark = p === "dark" || (p === "system" && matchMedia(${JSON.stringify(SCHEME_QUERIES.dark)}).matches);
    var root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    if (p === "system") return;
    var color = dark ? ${JSON.stringify(THEME_COLORS.dark)} : ${JSON.stringify(THEME_COLORS.light)};
    var pin = function () {
      document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
        m.media = m.content === color ? "all" : "not all";
      });
    };
    pin();
    document.addEventListener("DOMContentLoaded", pin);
  } catch (e) {}
})();`;

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/* Holds a choice that storage refused (some private modes throw on write),
   so the toggle still shows what is on screen. */
let unsavedPreference: ThemePreference | null = null;

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);

    if (isThemePreference(stored)) {
      return stored;
    }
  } catch {
    // Storage blocked: fall through.
  }

  return unsavedPreference ?? "system";
}

/** The theme on the page right now, read from `<html>`. */
export function readResolvedTheme(): ResolvedTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia(SCHEME_QUERIES.dark).matches ? "dark" : "light";
  }

  return preference;
}

/**
 * Puts a preference on the page: the `dark` class, `color-scheme`, and the
 * theme-color metas, switched by `media` as in `THEME_INIT_SCRIPT`. On
 * System each meta gets its own media query back.
 *
 * `suppressTransitions` is for a live switch. Without it every element with
 * a color transition would fade to the new theme at its own pace. The rule
 * stays for two frames, so the frame that restyles the page runs with
 * transitions off and the next one turns them back on.
 */
export function applyTheme(
  preference: ThemePreference,
  { suppressTransitions = false }: { suppressTransitions?: boolean } = {}
) {
  const theme = resolveTheme(preference);
  const root = document.documentElement;

  let freeze: HTMLStyleElement | null = null;

  if (suppressTransitions) {
    freeze = document.createElement("style");
    freeze.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(freeze);
  }

  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;

  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]'
  )) {
    const metaTheme: ResolvedTheme =
      meta.content === THEME_COLORS.dark ? "dark" : "light";

    if (preference === "system") {
      meta.media = SCHEME_QUERIES[metaTheme];
    } else {
      meta.media = metaTheme === theme ? "all" : "not all";
    }
  }

  if (freeze) {
    const style = freeze;
    window.getComputedStyle(document.body).getPropertyValue("color");
    requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
  }
}

export function notifyThemeChange() {
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);

  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

export function setThemePreference(preference: ThemePreference) {
  unsavedPreference = preference;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Applies for this page view only.
  }

  applyTheme(preference, { suppressTransitions: true });
  notifyThemeChange();
}
