/**
 * A tutor's address, in the order the registration form asks for it.
 *
 * `exactPlace` is the "Specific area" field (4 Kilo, Ayat, Bethel…); the
 * column keeps its original name because renaming it under `db push` would
 * drop and re-add it, losing every existing value.
 *
 * Tutors have one required address and an optional second one — a university
 * student may live in a dorm on weekdays and at their family's home on
 * weekends. The second address lives in the `address2*` columns, all null
 * when the tutor gave none.
 */

export const DEFAULT_COUNTRY = "Ethiopia";
export const DEFAULT_CITY = "Addis Ababa";

export type Address = {
  country: string;
  city: string;
  subcity: string;
  exactPlace: string;
};

export const EMPTY_SECOND_ADDRESS: Address = {
  country: DEFAULT_COUNTRY,
  city: DEFAULT_CITY,
  subcity: "",
  exactPlace: "",
};

export const ADDRESS_FIELD_LABELS: Record<keyof Address, string> = {
  country: "Country",
  city: "City / Region",
  subcity: "Sub-city / Zone",
  exactPlace: "Specific area",
};

type SecondAddressColumns = {
  address2Country: string | null;
  address2City: string | null;
  address2Subcity: string | null;
  address2ExactPlace: string | null;
};

/** The tutor's second address, or null when they gave none. */
export function secondAddressOf(tutor: SecondAddressColumns): Address | null {
  if (!tutor.address2Subcity && !tutor.address2ExactPlace) {
    return null;
  }

  return {
    country: tutor.address2Country ?? "",
    city: tutor.address2City ?? "",
    subcity: tutor.address2Subcity ?? "",
    exactPlace: tutor.address2ExactPlace ?? "",
  };
}

/** Most specific part first: "Ayat, Bole, Addis Ababa, Ethiopia". */
export function formatAddress(address: Partial<Address>): string {
  return [
    address.exactPlace,
    address.subcity,
    address.city,
    address.country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Reads and validates an address from a request, where each part arrives
 * under `${prefix}${Field}` (`address2Subcity`) or, with an empty prefix,
 * under the bare camelCase name (`subcity`). Country and city fall back to
 * their defaults when blank.
 *
 * Returns `{ error }` naming the first missing required part.
 */
export function readAddress(
  get: (key: string) => unknown,
  prefix: string
): { address: Address } | { error: string } {
  const read = (field: keyof Address) => {
    const key = prefix
      ? `${prefix}${field[0].toUpperCase()}${field.slice(1)}`
      : field;
    const value = get(key);

    return value === null || value === undefined ? "" : String(value).trim();
  };

  const address: Address = {
    country: read("country") || DEFAULT_COUNTRY,
    city: read("city") || DEFAULT_CITY,
    subcity: read("subcity"),
    exactPlace: read("exactPlace"),
  };

  const required: (keyof Address)[] = ["subcity", "exactPlace"];

  const missing = required.find((field) => !address[field]);

  if (missing) {
    return { error: `${ADDRESS_FIELD_LABELS[missing]} is required.` };
  }

  return { address };
}

/** The `address2*` columns for a Prisma write; all null clears the address. */
export function secondAddressColumns(
  address: Address | null
): SecondAddressColumns {
  return {
    address2Country: address?.country ?? null,
    address2City: address?.city ?? null,
    address2Subcity: address?.subcity ?? null,
    address2ExactPlace: address?.exactPlace ?? null,
  };
}
