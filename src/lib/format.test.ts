import { describe, expect, it } from "vitest";
import { formatCount, formatRating, upper } from "./format";

describe("formatRating", () => {
  it("uses the Turkish decimal comma by default", () => {
    expect(formatRating(4.9)).toBe("4,9");
    expect(formatRating(5)).toBe("5,0");
  });

  it("rounds half up on the decimal value", () => {
    expect(formatRating(4.85)).toBe("4,9");
    expect(formatRating(4.84)).toBe("4,8");
  });

  it("uses a dot in English", () => {
    expect(formatRating(4.9, "en")).toBe("4.9");
  });
});

describe("formatCount", () => {
  it("groups per locale", () => {
    expect(formatCount(1234)).toBe("1.234");
    expect(formatCount(1234, "en")).toBe("1,234");
    expect(formatCount(87)).toBe("87");
  });
});

describe("upper", () => {
  it("applies Turkish casing rules", () => {
    expect(upper("istanbul")).toBe("İSTANBUL");
    expect(upper("kadıköy")).toBe("KADIKÖY");
  });
});
