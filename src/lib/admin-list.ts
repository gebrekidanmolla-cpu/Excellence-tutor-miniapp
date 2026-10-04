/**
 * Client-side search, date and sort helpers shared by the admin lists.
 * Pure functions, so they behave the same during the server render and
 * after hydration.
 */

/**
 * Digits only, with Ethiopia's `+251` prefix folded into the local leading
 * `0`, so `+251 911 22 33 44`, `0911223344` and `911 22` all find each other.
 */
export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");

  return digits.startsWith("251") ? `0${digits.slice(3)}` : digits;
}

const PHONE_QUERY = /^[\d\s()+-]+$/;

/** One row's searchable text, built once per row rather than per keystroke. */
export type SearchIndex = {
  text: string;
  phones: string;
};

export function buildSearchIndex(
  fields: readonly (string | null | undefined)[],
  phones: readonly (string | null | undefined)[] = []
): SearchIndex {
  return {
    // A query word never contains a space, so joining on one keeps a word
    // from matching across the end of one field and the start of the next.
    text: fields.filter(Boolean).join(" ").toLowerCase(),
    phones: phones
      .filter((phone): phone is string => Boolean(phone))
      .map(phoneDigits)
      .join(" "),
  };
}

/**
 * Every word of the query has to appear somewhere in the row, so
 * "abebe math" narrows rather than widens. A query made only of digits and
 * phone punctuation is matched against the phone numbers as one number.
 */
export function matchesSearch(index: SearchIndex, query: string): boolean {
  const trimmed = query.trim();

  if (!trimmed) {
    return true;
  }

  // The length check counts the digits as typed: folding `+251 9` into
  // `09` must not make it too short to search with.
  if (
    PHONE_QUERY.test(trimmed) &&
    trimmed.replace(/\D/g, "").length >= 3 &&
    index.phones.includes(phoneDigits(trimmed))
  ) {
    return true;
  }

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .every((word) => index.text.includes(word));
}

// ==========================================
// DATE RANGES
// ==========================================

const DAY = 24 * 60 * 60 * 1000;

const RANGE_LENGTHS: Record<string, number> = {
  "24h": DAY,
  "7d": 7 * DAY,
  "30d": 30 * DAY,
};

export const DATE_RANGES = ["any", "24h", "7d", "30d"] as const;

export type DateRange = (typeof DATE_RANGES)[number];

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  any: "Any time",
  "24h": "Last 24h",
  "7d": "7 days",
  "30d": "30 days",
};

/**
 * `now` is when the server read the rows, passed down as a prop, never
 * `Date.now()` here: reading the clock while rendering would give the server
 * and the browser different answers for a row near the cutoff.
 */
export function isWithinRange(
  iso: string,
  range: DateRange,
  now: number
): boolean {
  const length = RANGE_LENGTHS[range];

  return length === undefined || now - Date.parse(iso) <= length;
}

/** Newest first. ISO timestamps from the same source sort as strings. */
export function byNewest<T extends { createdAt: string }>(a: T, b: T) {
  return b.createdAt.localeCompare(a.createdAt);
}

export function countBy<T>(
  rows: readonly T[],
  keyOf: (row: T) => string
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const row of rows) {
    const key = keyOf(row);

    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

/** "1 tutor", "3 tutors". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : pluralForm}`;
}
