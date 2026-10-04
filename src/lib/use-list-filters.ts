"use client";

import { useDeferredValue, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Each filter's allowed values. The first one is the default, which is left
 * out of the URL so an unfiltered list keeps a clean address.
 */
export type FilterSpec = Readonly<Record<string, readonly [string, ...string[]]>>;

export type FilterValues<S extends FilterSpec> = {
  [K in keyof S]: S[K][number];
};

/**
 * A list's search box and filter chips, stored in the query string so a
 * filtered view can be bookmarked and survives a refresh.
 *
 * Writes go through `window.history.replaceState`, which Next folds into
 * `useSearchParams` without a server round trip: tapping a chip costs no
 * function invocation. Replacing rather than pushing keeps Back meaning
 * "the previous page", not "the previous chip".
 *
 * The search box holds its own state, read from the URL once on mount.
 * Next applies `replaceState` inside a transition, so an input fed straight
 * from `useSearchParams` would lag a keystroke and jump the cursor.
 * A link to the same page with different filters still resets it: list
 * pages key their client component on the incoming query string.
 *
 * `persistent` keys (the sort order) survive "Clear" and don't count as
 * active filters.
 */
export function useListFilters<const S extends FilterSpec>(
  spec: S,
  {
    persistent = [],
    pageSize = 25,
  }: {
    persistent?: readonly (keyof S & string)[];
    pageSize?: number;
  } = {}
) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const keys = Object.keys(spec) as (keyof S & string)[];

  const filterKeys = keys.filter((key) => !persistent.includes(key));

  const filters = {} as FilterValues<S>;

  for (const key of keys) {
    const value = searchParams.get(key);

    // An unknown value (a stale bookmark, a typo) falls back to the default.
    filters[key] = (
      value !== null && spec[key].includes(value) ? value : spec[key][0]
    ) as FilterValues<S>[typeof key];
  }

  const [query, setQueryState] = useState(() => searchParams.get("q") ?? "");

  /* Filtering a few hundred rows is fast, but typing should never wait on it. */
  const deferredQuery = useDeferredValue(query);

  function writeParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search);

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    const search = params.toString();

    window.history.replaceState(
      null,
      "",
      search ? `${pathname}?${search}` : pathname
    );
  }

  /* Any change to what the list holds starts it again from one page. */
  function setFilter(key: keyof S & string, value: string) {
    writeParams({ [key]: value === spec[key][0] ? null : value, show: null });
  }

  function setQuery(value: string) {
    setQueryState(value);
    writeParams({ q: value.trim() ? value : null, show: null });
  }

  /** Clears the search and every filter, keeping the persistent keys. */
  function clear() {
    setQueryState("");

    writeParams(
      Object.fromEntries(
        [...filterKeys, "q", "show"].map((key) => [key, null])
      )
    );
  }

  /*
   * How many rows to render. Rendering every row at once would hydrate
   * hundreds of menus and dialogs on a phone. Kept in the URL too, because
   * `router.refresh()` after a row action can remount the list, and an
   * admin who had scrolled to row 60 should still find it there.
   */
  const shown = Number(searchParams.get("show"));

  const limit =
    Number.isInteger(shown) && shown > pageSize ? shown : pageSize;

  function showMore() {
    writeParams({ show: String(limit + pageSize) });
  }

  const activeCount =
    filterKeys.filter((key) => filters[key] !== spec[key][0]).length +
    (query.trim() ? 1 : 0);

  return {
    filters,
    query,
    deferredQuery,
    setFilter,
    setQuery,
    clear,
    activeCount,
    limit,
    showMore,
  };
}
