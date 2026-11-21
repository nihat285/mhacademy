import { describe, expect, it } from "vitest";
import { bakuDay, isReleased, nextStreak } from "./release";
import { groupContiguous, shuffle, shuffleGrouped } from "./shuffle";

const ends = new Date("2026-11-10T12:00:00Z");

describe("isReleased", () => {
  it("immediate is always released", () => expect(isReleased({ resultRelease: "immediate", endsAt: ends, resultsReleasedAt: null }, new Date("2026-01-01"))).toBe(true));
  it("after_end waits for the window to close", () => {
    const e = { resultRelease: "after_end" as const, endsAt: ends, resultsReleasedAt: null };
    expect(isReleased(e, new Date("2026-11-10T11:59:59Z"))).toBe(false);
    expect(isReleased(e, new Date("2026-11-10T12:00:00Z"))).toBe(true);
  });
  it("manual needs an explicit release time in the past", () => {
    expect(isReleased({ resultRelease: "manual", endsAt: ends, resultsReleasedAt: null }, new Date("2030-01-01"))).toBe(false);
    expect(isReleased({ resultRelease: "manual", endsAt: ends, resultsReleasedAt: new Date("2026-11-11") }, new Date("2026-11-12"))).toBe(true);
    expect(isReleased({ resultRelease: "manual", endsAt: ends, resultsReleasedAt: new Date("2026-11-11") }, new Date("2026-11-10"))).toBe(false);
  });
});

describe("shuffle", () => {
  it("keeps every element exactly once and does not mutate the input", () => {
    const src = Array.from({ length: 50 }, (_, i) => i);
    const out = shuffle(src);
    expect(src).toEqual(Array.from({ length: 50 }, (_, i) => i));
    expect([...out].sort((a, b) => a - b)).toEqual(src);
  });
  it("is deterministic for a deterministic rng", () => expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]));
  it("handles empty and single arrays", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["x"])).toEqual(["x"]);
  });
});

describe("streak", () => {
  it("continues on consecutive days, resets after a gap, and is idempotent within a day", () => {
    expect(nextStreak("2026-11-05", 3, "2026-11-06")).toBe(4);
    expect(nextStreak("2026-11-06", 4, "2026-11-06")).toBe(4);
    expect(nextStreak("2026-11-01", 9, "2026-11-06")).toBe(1);
    expect(nextStreak(null, 0, "2026-11-06")).toBe(1);
    expect(nextStreak("2026-12-31", 2, "2027-01-01")).toBe(3);
  });
  it("uses the Baku calendar day", () => expect(bakuDay(new Date("2026-11-06T21:00:00Z"))).toBe("2026-11-07"));
});


describe("passage grouping", () => {
  const g: Record<string, string | undefined> = { a: "P1", b: "P1", c: undefined, d: "P2", e: "P2", f: "P1" };
  const ids = ["a", "c", "d", "b", "e", "f"];
  it("groupContiguous keeps passage questions together, in first-appearance order", () => {
    expect(groupContiguous(ids, (x) => g[x])).toEqual(["a", "b", "f", "c", "d", "e"]);
  });
  it("shuffleGrouped never splits a passage and keeps all questions", () => {
    for (let i = 0; i < 200; i++) {
      const out = shuffleGrouped(ids, (x) => g[x]);
      expect([...out].sort()).toEqual([...ids].sort());
      const pos = (k: string) => out.indexOf(k);
      expect(Math.abs(pos("a") - pos("b"))).toBe(1);
      expect(pos("f")).toBe(pos("b") + 1);
      expect(Math.abs(pos("d") - pos("e"))).toBe(1);
      expect(pos("a")).toBeLessThan(pos("b"));
    }
  });
});
