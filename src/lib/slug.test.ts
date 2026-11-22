import { describe, expect, it } from "vitest";
import { slugify, stripMahalleSuffix } from "./slug.ts";

describe("slugify", () => {
  it("transliterates Turkish letters", () => {
    expect(slugify("Kâğıthane")).toBe("kagithane");
    expect(slugify("Üsküdar")).toBe("uskudar");
    expect(slugify("Şişli")).toBe("sisli");
    expect(slugify("İstanbul")).toBe("istanbul");
    expect(slugify("Eyüpsultan")).toBe("eyupsultan");
  });

  it("collapses punctuation and spaces", () => {
    expect(slugify("Hırka-i Şerif")).toBe("hirka-i-serif");
    expect(slugify("  Yavuz Sultan Selim ")).toBe("yavuz-sultan-selim");
  });
});

describe("stripMahalleSuffix", () => {
  it("drops the Mahallesi suffix only at the end", () => {
    expect(stripMahalleSuffix("Caddebostan Mahallesi")).toBe("Caddebostan");
    expect(stripMahalleSuffix("Mahallesi Köyü")).toBe("Mahallesi Köyü");
  });
});
