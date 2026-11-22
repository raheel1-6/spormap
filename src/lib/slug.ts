const TURKISH: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  i̇: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

/** URL slug with Turkish transliteration: "Kâğıthane" → "kagithane", "Hırka-i Şerif" → "hirka-i-serif". */
export function slugify(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]|i̇/g, (ch) => TURKISH[ch] ?? ch)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** OSM mahalle names carry a "Mahallesi" suffix that the UI drops: "Caddebostan Mahallesi" → "Caddebostan". */
export function stripMahalleSuffix(name: string): string {
  return name.replace(/\s+(Mahallesi|Mah\.?)$/u, "").trim();
}
