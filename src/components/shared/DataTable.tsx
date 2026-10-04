import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpandableRow } from "@/components/shared/ExpandableRow";
import { cn } from "@/lib/utils";

/**
 * The responsive shell for the admin lists.
 *
 * The existing tables carried `min-w-225` / `min-w-300` (900px / 1200px),
 * which forced horizontal scrolling on every phone. Here the same column set
 * renders as stacked cards below `md:` and as a real table from `md:` up.
 *
 * Deliberately *not* a client component: `cell` is a render function, and a
 * server page could not pass one across a client boundary. The functions run
 * during render, so only the resulting nodes reach the client `Table` parts.
 */
export type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (item: T) => React.ReactNode;
  headClassName?: string;
  cellClassName?: string;
  /** Leave this column out of the stacked mobile card. */
  hideOnMobile?: boolean;
  /** Render as the card's heading line rather than a label/value pair. */
  mobileTitle?: boolean;
};

/**
 * Where the cards give way to the table. A wide table (many columns, or row
 * actions) uses `xl`: below that it would scroll sideways inside its
 * container, so the cards carry on, two to a row from `md:` up.
 */
const BREAKPOINT_CLASSES = {
  md: { cards: "space-y-3 md:hidden", table: "hidden md:block" },
  xl: {
    cards:
      "space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 xl:hidden",
    table: "hidden xl:block",
  },
} as const;

export function DataTable<T>({
  items,
  columns,
  getRowKey,
  renderMobileCard,
  renderExpanded,
  getExpandLabel,
  empty,
  caption,
  breakpoint = "md",
  className,
}: {
  items: readonly T[];
  columns: readonly DataTableColumn<T>[];
  getRowKey: (item: T, index: number) => string;
  /** Overrides the auto-generated mobile card when a bespoke layout is better. */
  renderMobileCard?: (item: T) => React.ReactNode;
  /**
   * Supplying this adds a leading expander column whose chevron reveals the
   * returned node in a full-width row beneath. Omit it and the table renders
   * exactly as before — the other call sites are unaffected.
   *
   * The mobile cards are not expanded automatically: pass a bespoke
   * `renderMobileCard` using `ExpandableDisclosure` when they need it too.
   */
  renderExpanded?: (item: T) => React.ReactNode;
  getExpandLabel?: (item: T) => string;
  empty?: React.ReactNode;
  caption?: string;
  breakpoint?: keyof typeof BREAKPOINT_CLASSES;
  className?: string;
}) {
  if (items.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  const titleColumn = columns.find((column) => column.mobileTitle);

  const mobileColumns = columns.filter(
    (column) => !column.hideOnMobile && !column.mobileTitle
  );

  const layout = BREAKPOINT_CLASSES[breakpoint];

  return (
    <div className={className}>
      {/* Mobile: stacked cards */}
      <ul className={layout.cards}>
        {items.map((item, index) => (
          <li
            key={getRowKey(item, index)}
            className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
          >
            {renderMobileCard ? (
              renderMobileCard(item)
            ) : (
              <>
                {titleColumn ? (
                  <div className="mb-3 font-medium">
                    {titleColumn.cell(item)}
                  </div>
                ) : null}

                <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                  {mobileColumns.map((column) => (
                    <div key={column.id} className="contents">
                      <dt className="text-muted-foreground">
                        {column.header}
                      </dt>
                      <dd className="min-w-0 text-right font-medium break-words">
                        {column.cell(item)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* Desktop: a real table */}
      <div
        className={cn(
          "overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
          layout.table
        )}
      >
        <Table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}

          <TableHeader>
            <TableRow className="bg-muted/50">
              {renderExpanded ? (
                <TableHead className="w-px">
                  <span className="sr-only">Expand</span>
                </TableHead>
              ) : null}

              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn("whitespace-nowrap", column.headClassName)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((item, index) => {
              const cells = columns.map((column) => (
                <TableCell
                  key={column.id}
                  className={cn("align-middle", column.cellClassName)}
                >
                  {column.cell(item)}
                </TableCell>
              ));

              if (renderExpanded) {
                return (
                  <ExpandableRow
                    key={getRowKey(item, index)}
                    cells={cells}
                    expanded={renderExpanded(item)}
                    colSpan={columns.length + 1}
                    label={
                      getExpandLabel?.(item) ?? "Show more details for this row"
                    }
                  />
                );
              }

              return (
                <TableRow key={getRowKey(item, index)}>{cells}</TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
