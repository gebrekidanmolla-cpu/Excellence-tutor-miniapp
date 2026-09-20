import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function DataTable<T>({
  items,
  columns,
  getRowKey,
  renderMobileCard,
  empty,
  caption,
  className,
}: {
  items: readonly T[];
  columns: readonly DataTableColumn<T>[];
  getRowKey: (item: T, index: number) => string;
  /** Overrides the auto-generated mobile card when a bespoke layout is better. */
  renderMobileCard?: (item: T) => React.ReactNode;
  empty?: React.ReactNode;
  caption?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  const titleColumn = columns.find((column) => column.mobileTitle);

  const mobileColumns = columns.filter(
    (column) => !column.hideOnMobile && !column.mobileTitle
  );

  return (
    <div className={className}>
      {/* Mobile: stacked cards */}
      <ul className="space-y-3 md:hidden">
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
      <div className="hidden overflow-hidden rounded-xl ring-1 ring-foreground/10 md:block">
        <Table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}

          <TableHeader>
            <TableRow className="bg-muted/50">
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
            {items.map((item, index) => (
              <TableRow key={getRowKey(item, index)}>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn("align-middle", column.cellClassName)}
                  >
                    {column.cell(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
