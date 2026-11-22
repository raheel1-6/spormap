/** Locale-aware number formatting for ratings and review counts. Turkish is the default. */

export type Locale = "tr" | "en";

const tag = (locale: Locale) => (locale === "tr" ? "tr-TR" : "en-US");

/**
 * One decimal, half-up on the decimal value, locale separator: 4.85 → "4,9" (tr) / "4.9" (en).
 * Rounds via a decimal string so 4.85 (stored as 4.8499…) still rounds up.
 */
export function formatRating(value: number, locale: Locale = "tr"): string {
  const rounded = Math.round(Number(`${value}e1`)) / 10;
  return new Intl.NumberFormat(tag(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rounded);
}

/** Grouped integer: 1234 → "1.234" (tr) / "1,234" (en). */
export function formatCount(value: number, locale: Locale = "tr"): string {
  return new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 0, useGrouping: "always" }).format(
    value,
  );
}

/** Turkish-aware uppercase for small-caps labels: "istanbul" → "İSTANBUL", "kadıköy" → "KADIKÖY". */
export function upper(text: string, locale: Locale = "tr"): string {
  return text.toLocaleUpperCase(tag(locale));
}
