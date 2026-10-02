import { revalidatePath } from "next/cache";

/**
 * The landing page lists open jobs and stays cached until they change
 * (its `revalidate` is only an hourly backstop). Every route that commits a
 * write to a job — create, edit, delete, status, reopen, assign — calls this
 * afterwards, so the page updates on the next visit instead of being rebuilt
 * every minute whether or not anything changed.
 */
export function refreshPublicJobPages() {
  revalidatePath("/");
}
