/**
 * Structured data for search engines, rendered as a plain `<script>` tag
 * as the Next.js JSON-LD guide recommends (it is data, not code, so not
 * `next/script`).
 *
 * `JSON.stringify` leaves `<` alone, so a value containing `</script>` —
 * an admin-typed job detail, say — would end the tag early. Escaping every
 * `<` as `<` keeps the JSON identical while making that impossible.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
