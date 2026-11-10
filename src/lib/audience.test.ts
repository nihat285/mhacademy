import { describe, expect, it } from "vitest";
import { audienceRoles, chunk } from "./audience";

describe("audienceRoles", () => {
  it("maps each audience to recipient roles", () => {
    expect(audienceRoles("all")).toEqual(["student", "teacher"]);
    expect(audienceRoles("students")).toEqual(["student"]);
    expect(audienceRoles("teachers")).toEqual(["teacher"]);
    expect(audienceRoles("class")).toEqual(["student"]);
  });
});

describe("chunk", () => {
  it("splits into batches no larger than the size", () => {
    const parts = chunk(Array.from({ length: 1201 }, (_, i) => i), 500);
    expect(parts.map((p) => p.length)).toEqual([500, 500, 201]);
  });
  it("handles empty input and exact multiples", () => {
    expect(chunk([], 500)).toEqual([]);
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });
  it("rejects a non-positive size", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});
