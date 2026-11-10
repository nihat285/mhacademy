import { describe, expect, it } from "vitest";
import { isSafeHttpsUrl, optionalHttpsUrl } from "./safe-url";

describe("isSafeHttpsUrl", () => {
  it("accepts ordinary https URLs", () => {
    expect(isSafeHttpsUrl("https://instagram.com/mhacademy")).toBe(true);
  });
  it("rejects dangerous or non-https schemes", () => {
    for (const bad of ["javascript:alert(1)", "http://example.com", "data:text/html,x", "//example.com", "ftp://x.com", "https://user:pw@example.com", "https://localhost", "not a url", "JaVaScRiPt:alert(1)"]) {
      expect(isSafeHttpsUrl(bad)).toBe(false);
    }
  });
});

describe("optionalHttpsUrl", () => {
  it("allows empty and trims", () => {
    expect(optionalHttpsUrl.parse("   ")).toBe("");
    expect(optionalHttpsUrl.parse(" https://t.me/x ")).toBe("https://t.me/x");
  });
  it("rejects javascript: URLs", () => {
    expect(optionalHttpsUrl.safeParse("javascript:alert(1)").success).toBe(false);
  });
});
