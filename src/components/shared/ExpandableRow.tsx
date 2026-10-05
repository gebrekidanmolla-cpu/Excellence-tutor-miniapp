"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * The open state for one expandable table row.
 *
 * This exists as its own client component so `DataTable` can stay a server
 * component: it builds the cell nodes as it already does and hands them here
 * as children, which is the ordinary server-parent / client-child pattern.
 * Putting the `useState` in `DataTable` itself would force `"use client"` on
 * it and break the server pages that pass `cell` render functions.
 */
export function ExpandableRow({
  cells,
  expanded,
  colSpan,
  label,
}: {
  cells: React.ReactNode;
  expanded: React.ReactNode;
  /** Total column count, including the expander column. */
  colSpan: number;
  /** Names the row for screen readers, e.g. "Details for Abebe Kebede". */
  label: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <TableRow>
        <TableCell className="w-px pr-0 align-middle">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-label={label}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn(
                "size-4 transition-transform duration-200",
                open && "rotate-90"
              )}
            />
          </button>
        </TableCell>

        {cells}
      </TableRow>

      {open ? (
        /* `hover:bg-muted/30` cancels TableRow's own hover so the panel reads
           as part of the row above rather than as a separate hoverable row. */
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={colSpan} className="p-0 whitespace-normal">
            <div className="px-4 py-3.5">{expanded}</div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

/**
 * The same disclosure for the stacked mobile cards, where there is no table
 * row to extend. Used directly by client callers inside `renderMobileCard`.
 */
export function ExpandableDisclosure({
  label = "More details",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="-my-1.5 flex items-center gap-1 rounded-md py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronRight
          aria-hidden="true"
          className={cn(
            "size-4 transition-transform duration-200",
            open && "rotate-90"
          )}
        />
        {open ? "Hide details" : label}
      </button>

      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
