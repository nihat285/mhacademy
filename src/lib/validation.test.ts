import { describe, expect, it } from "vitest";
import { safeNext } from "./validation";

describe("safeNext (open-redirect guard)", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/panel/sinaqlar?x=1", "/")).toBe("/panel/sinaqlar?x=1");
  });
  it("rejects absolute, protocol-relative, backslash and control-character tricks", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "evil.com", "", "javascript:alert(1)"]) {
      expect(safeNext(bad, "/fallback")).toBe("/fallback");
    }
    expect(safeNext(null, "/fallback")).toBe("/fallback");
  });
});
