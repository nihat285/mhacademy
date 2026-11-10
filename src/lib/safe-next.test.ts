import { describe, expect, it } from "vitest";
import { safeNext } from "./validation";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/sinaqlar/abc?x=1", "/panel")).toBe("/sinaqlar/abc?x=1");
  });
  it("rejects external, protocol-relative and control-character tricks", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "javascript:alert(1)", "", null, undefined]) {
      expect(safeNext(bad as string | null | undefined, "/panel")).toBe("/panel");
    }
  });
});
