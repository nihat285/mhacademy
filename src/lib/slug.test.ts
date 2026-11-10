import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, slugify } from "./slug";

describe("slugify", () => {
  it("transliterates Azerbaijani letters", () => {
    expect(slugify("Leyla Quliyeva")).toBe("leyla-quliyeva");
    expect(slugify("Əli Şükürov İsmayıl")).toBe("eli-sukurov-ismayil");
    expect(slugify("Çiçək Göyçay")).toBe("cicek-goycay");
  });
  it("never returns an empty or invalid slug", () => {
    expect(slugify("!!!")).toBe("muellim");
    expect(SLUG_PATTERN.test(slugify("  -- A  B -- "))).toBe(true);
  });
  it("limits length", () => {
    expect(slugify("a".repeat(300)).length).toBeLessThanOrEqual(100);
  });
});
