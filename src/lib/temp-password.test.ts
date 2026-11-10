import { describe, expect, it } from "vitest";
import { passwordProblems } from "./password";
import { generateTempPassword } from "./temp-password";

describe("generateTempPassword", () => {
  it("always passes the platform password policy and has the expected shape", () => {
    for (let i = 0; i < 200; i++) {
      const p = generateTempPassword();
      expect(p).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
      expect(passwordProblems(p)).toBeNull();
      expect(/\d/.test(p)).toBe(true);
    }
  });
  it("does not repeat", () => {
    const set = new Set(Array.from({ length: 200 }, () => generateTempPassword()));
    expect(set.size).toBe(200);
  });
});
