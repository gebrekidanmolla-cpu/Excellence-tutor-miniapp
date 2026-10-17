/**
 * Ethiopian mobile numbers. The registration form collects only the 9 digits
 * after +251; the database stores the canonical `+2519XXXXXXXX` form.
 */

export const ETHIOPIAN_LOCAL_PHONE_PATTERN = /^[79]\d{8}$/;

/**
 * Strips a leading country code or trunk zero so a pasted `+251912345678` or
 * `0912345678` still yields the 9 local digits.
 */
export function normalizeEthiopianPhone(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("251")) {
    digits = digits.slice(3);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 9);
}

/** `+2519XXXXXXXX` for any accepted input format, or null when invalid. */
export function canonicalEthiopianPhone(value: string): string | null {
  const local = normalizeEthiopianPhone(value);

  return ETHIOPIAN_LOCAL_PHONE_PATTERN.test(local) ? `+251${local}` : null;
}
