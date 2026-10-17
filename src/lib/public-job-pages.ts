import { revalidatePath } from "next/cache";

/**
 * Three cached responses show a job: the landing page lists open jobs,
 * `/apply/<jobCode>` is served to signed-out visitors from a cached copy
 * (`src/app/apply/[jobCode]/guest`), and `/api/jobs` feeds the `/jobs` list.
 * All stay cached until a job changes — their `revalidate` values are only
 * backstops. Every route that commits a write to a job — create, edit,
 * delete, status, reopen, assign — calls this afterwards, so all three
 * update on the next visit.
 *
 * The guest page is revalidated by its rewrite destination, not the
 * `/apply/<jobCode>` URL visitors see: that is where the cache entry lives.
 * Creating a job refreshes its code's page too, which clears a cached 404 if
 * anyone had opened that URL before the job existed.
 */
export function refreshPublicJobPages(jobCode: string) {
  revalidatePath("/");
  revalidatePath(`/apply/${jobCode}/guest`);
  revalidatePath("/api/jobs");
}
