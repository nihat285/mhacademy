import { describe, expect, it } from "vitest";
import { canDirectMessage, chatBase, containsPhoneNumber, orderPair } from "./chat-rules";

const s1 = { id: "s1", role: "student" as const };
const s2 = { id: "s2", role: "student" as const };
const t = { id: "t1", role: "teacher" as const };
const a = { id: "a1", role: "admin" as const };

describe("canDirectMessage", () => {
  it("blocks student-to-student and self", () => {
    expect(canDirectMessage(s1, s2)).toBe(false);
    expect(canDirectMessage(s1, s1)).toBe(false);
  });
  it("allows students with staff and staff with staff", () => {
    expect(canDirectMessage(s1, t)).toBe(true);
    expect(canDirectMessage(a, s1)).toBe(true);
    expect(canDirectMessage(t, a)).toBe(true);
  });
});

describe("helpers", () => {
  it("orders pairs symmetrically", () => {
    expect(orderPair("b", "a")).toEqual(["a", "b"]);
    expect(orderPair("a", "b")).toEqual(["a", "b"]);
  });
  it("maps roles to panel paths", () => {
    expect(chatBase("student")).toBe("/panel/yazisma");
    expect(chatBase("admin")).toBe("/idare/yazisma");
  });
});

describe("containsPhoneNumber", () => {
  it("flags phone-like numbers", () => {
    for (const t of ["050 123 45 67", "zəng et 0501234567", "+994 50 123 45 67", "(012) 345-67-89", "nömrəm 50.123.45.67"]) expect(containsPhoneNumber(t)).toBe(true);
  });
  it("ignores dates, scores and short numbers", () => {
    for (const t of ["12.03.2026", "700 bal topladım", "sual 15 və 16", "2026-11-10", "salam"]) expect(containsPhoneNumber(t)).toBe(false);
  });
});
