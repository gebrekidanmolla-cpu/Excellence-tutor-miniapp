"use client";

import { useId, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

export type FilterGroup = {
  /** The query-string key, e.g. `status`. */
  id: string;
  label: string;
  value: string;
  /** The first option is the default ("All", "Any time", "Newest"). */
  options: readonly FilterOption[];
};

/**
 * The sticky search-and-filter bar above each admin list.
 *
 * Every chip is a native radio, so a tap applies it at once and arrow keys
 * move along a group. The primary group (usually status) is always on
 * screen. The rest sit inline on a wide screen (`xl:`); below that they
 * move into a bottom sheet behind "Filters", which keeps the sticky bar
 * short enough to leave room for the list.
 */
export function ListToolbar({
  searchLabel,
  searchPlaceholder,
  query,
  onQueryChange,
  primary,
  groups,
  onFilterChange,
  summary,
  resultLabel,
  onClear,
}: {
  searchLabel: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  primary: FilterGroup;
  groups: readonly FilterGroup[];
  onFilterChange: (id: string, value: string) => void;
  /** "12 of 318 applications", announced as it changes. */
  summary: React.ReactNode;
  /** The sheet's close button: "Show 12 applications". */
  resultLabel: string;
  /** Shown only while something is filtered. */
  onClear?: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const changedInSheet = groups.filter(
    (group) => group.value !== group.options[0]?.value
  ).length;

  return (
    // Not sticky on a short screen: with the header and tab bar it covered
    // all but ~80px of a phone held sideways.
    <div className="sticky top-14 z-30 -mx-4 space-y-3 bg-[color-mix(in_srgb,var(--muted)_30%,var(--background))] px-4 py-3 shadow-[0_1px_0_var(--border)] short:static sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <div className="flex min-w-0 gap-2 md:min-w-64 md:flex-1">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              type="search"
              size="xl"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
              enterKeyHint="search"
              autoComplete="off"
              className="bg-background pl-9 md:h-9 md:text-sm"
            />
          </div>

          {groups.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="xl"
              /* Matches the search field, which drops to 36px from md. */
              className="md:h-9 md:text-sm xl:hidden"
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal data-icon="inline-start" aria-hidden="true" />
              Filters
              {changedInSheet > 0 ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground tabular-nums">
                  {changedInSheet}
                  <span className="sr-only"> active</span>
                </span>
              ) : null}
            </Button>
          ) : null}
        </div>

        <SegmentedGroup group={primary} onChange={onFilterChange} />
      </div>

      {groups.length > 0 ? (
        <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 xl:flex">
          {groups.map((group) => (
            <ChipGroup
              key={group.id}
              group={group}
              onChange={onFilterChange}
              inline
            />
          ))}
        </div>
      ) : null}

      <div className="flex min-h-8 items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {summary}
        </p>

        {onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="max-md:h-9 max-md:px-3"
          >
            <X data-icon="inline-start" aria-hidden="true" />
            Clear filters
          </Button>
        ) : null}
      </div>

      {groups.length > 0 ? (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[85svh] gap-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)] xl:hidden"
          >
            <SheetHeader className="border-b">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {groups.map((group) => (
                <ChipGroup
                  key={group.id}
                  group={group}
                  onChange={onFilterChange}
                />
              ))}
            </div>

            <SheetFooter className="border-t">
              <Button size="xl" onClick={() => setSheetOpen(false)}>
                {resultLabel}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

/**
 * Equal-width segments that always fit one row: on a phone the count sits
 * under the label, so five statuses share 340px without wrapping. Below
 * 375px equal widths cut "Reviewed" to "Revie…", so each segment takes its
 * own width instead ("All" needs far less than the rest).
 */
function SegmentedGroup({
  group,
  onChange,
}: {
  group: FilterGroup;
  onChange: (id: string, value: string) => void;
}) {
  const name = useId();

  return (
    <div
      role="radiogroup"
      aria-label={group.label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-muted p-1 max-[374px]:auto-cols-auto md:inline-grid md:auto-cols-auto"
    >
      {group.options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg px-1 text-xs font-medium text-muted-foreground transition-colors select-none",
            "hover:text-foreground",
            "has-[:checked]:bg-background has-[:checked]:text-foreground has-[:checked]:shadow-sm",
            "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
            "md:min-h-8 md:flex-row md:gap-1.5 md:px-3 md:text-sm"
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={group.value === option.value}
            onChange={() => onChange(group.id, option.value)}
            className="sr-only"
          />

          <span className="max-w-full truncate">{option.label}</span>

          {option.count !== undefined ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {option.count.toLocaleString("en-US")}
            </span>
          ) : null}
        </label>
      ))}
    </div>
  );
}

function ChipGroup({
  group,
  onChange,
  inline = false,
}: {
  group: FilterGroup;
  onChange: (id: string, value: string) => void;
  /** Label beside the chips (desktop bar) rather than above them (sheet). */
  inline?: boolean;
}) {
  const name = useId();
  const labelId = `${name}-label`;

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className={cn("flex flex-wrap items-center", inline ? "gap-1.5" : "gap-2")}
    >
      <span
        id={labelId}
        className={cn(
          "text-xs font-medium text-muted-foreground",
          inline ? "mr-1" : "w-full"
        )}
      >
        {group.label}
      </span>

      {group.options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-background font-medium transition-colors select-none",
            "hover:border-primary/40 hover:bg-primary/[0.03]",
            "has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary",
            "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
            inline ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm"
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={group.value === option.value}
            onChange={() => onChange(group.id, option.value)}
            className="sr-only"
          />

          {option.label}

          {option.count !== undefined ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {option.count.toLocaleString("en-US")}
            </span>
          ) : null}
        </label>
      ))}
    </div>
  );
}

/** "Show 25 more" under a long list. */
export function ShowMore({
  shown,
  total,
  noun,
  onShowMore,
}: {
  shown: number;
  total: number;
  noun: string;
  onShowMore: () => void;
}) {
  if (shown >= total) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      <p className="text-sm text-muted-foreground tabular-nums">
        Showing {shown.toLocaleString("en-US")} of{" "}
        {total.toLocaleString("en-US")} {noun}
      </p>

      <Button variant="outline" size="xl" onClick={onShowMore}>
        Show more
      </Button>
    </div>
  );
}
