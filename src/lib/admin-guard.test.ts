import { describe, expect, it } from "vitest";
import { removesAdminPrivileges, wouldRemoveLastAdmin } from "./admin-guard";

describe("wouldRemoveLastAdmin", () => {
  it("blocks the only active admin", () => {
    expect(wouldRemoveLastAdmin(["a"], "a")).toBe(true);
  });
  it("allows removing one of several admins", () => {
    expect(wouldRemoveLastAdmin(["a", "b"], "a")).toBe(false);
  });
  it("ignores targets that are not active admins", () => {
    expect(wouldRemoveLastAdmin(["a"], "x")).toBe(false);
    expect(wouldRemoveLastAdmin([], "x")).toBe(false);
  });
});

describe("removesAdminPrivileges", () => {
  const admin = { role: "admin", status: "active" };
  it("detects demotion, suspension and deletion", () => {
    expect(removesAdminPrivileges(admin, { role: "teacher" })).toBe(true);
    expect(removesAdminPrivileges(admin, { status: "suspended" })).toBe(true);
    expect(removesAdminPrivileges(admin, { deleted: true })).toBe(true);
  });
  it("does not trigger for harmless changes or non-admins", () => {
    expect(removesAdminPrivileges(admin, { role: "admin", status: "active" })).toBe(false);
    expect(removesAdminPrivileges({ role: "teacher", status: "active" }, { deleted: true })).toBe(false);
    expect(removesAdminPrivileges({ role: "admin", status: "suspended" }, { deleted: true })).toBe(false);
  });
});
