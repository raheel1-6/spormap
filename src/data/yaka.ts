/**
 * Which side of the Bosphorus each district belongs to (by slug).
 * Not an administrative level in OSM; Yaka polygons are dissolved from these sets.
 * Adalar (Princes' Islands) is administered from the Asian side.
 */
export const ANADOLU = [
  "adalar",
  "atasehir",
  "beykoz",
  "cekmekoy",
  "kadikoy",
  "kartal",
  "maltepe",
  "pendik",
  "sancaktepe",
  "sultanbeyli",
  "sile",
  "tuzla",
  "umraniye",
  "uskudar",
] as const;

export const AVRUPA = [
  "arnavutkoy",
  "avcilar",
  "bagcilar",
  "bahcelievler",
  "bakirkoy",
  "basaksehir",
  "bayrampasa",
  "besiktas",
  "beylikduzu",
  "beyoglu",
  "buyukcekmece",
  "catalca",
  "esenler",
  "esenyurt",
  "eyupsultan",
  "fatih",
  "gaziosmanpasa",
  "gungoren",
  "kagithane",
  "kucukcekmece",
  "sariyer",
  "silivri",
  "sultangazi",
  "sisli",
  "zeytinburnu",
] as const;

export type YakaId = "avrupa-yakasi" | "anadolu-yakasi";

export function yakaOf(districtSlug: string): YakaId | undefined {
  if ((ANADOLU as readonly string[]).includes(districtSlug)) return "anadolu-yakasi";
  if ((AVRUPA as readonly string[]).includes(districtSlug)) return "avrupa-yakasi";
  return undefined;
}
