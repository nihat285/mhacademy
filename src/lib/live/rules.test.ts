import { describe, expect, it } from "vitest";
import { parseBakuLocal, sessionPhase, toBakuInput, validateJoinUrl, validateSchedule } from "./rules";

describe("validateJoinUrl", () => {
  it("accepts https meeting links and derives the provider", () => {
    expect(validateJoinUrl("https://us02web.zoom.us/j/123?pwd=abc")).toMatchObject({ ok: true, provider: "zoom" });
    expect(validateJoinUrl("https://meet.google.com/abc-defg-hij")).toMatchObject({ ok: true, provider: "meet" });
    expect(validateJoinUrl("https://teams.microsoft.com/l/meetup-join/x")).toMatchObject({ ok: true, provider: "teams" });
    expect(validateJoinUrl("https://meet.jit.si/MHAcademy-riyaziyyat")).toMatchObject({ ok: true, provider: "other" });
  });
  it("rejects dangerous or private targets", () => {
    for (const bad of ["http://zoom.us/j/1", "javascript:alert(1)", "https://localhost/x", "https://127.0.0.1/x", "https://192.168.0.5/x", "https://user:pw@zoom.us/j/1", "zoom.us/j/1", "", "https://intranet/x", "data:text/html,hi"]) {
      expect(validateJoinUrl(bad).ok, bad).toBe(false);
    }
  });
  it("does not let a look-alike host pass as Zoom", () => {
    expect(validateJoinUrl("https://zoom.us.evil.com/j/1")).toMatchObject({ ok: true, provider: "other" });
    expect(validateJoinUrl("https://notzoom.us/j/1")).toMatchObject({ ok: true, provider: "other" });
  });
});

describe("sessionPhase", () => {
  const startsAt = new Date("2026-11-20T14:30:00Z");
  const at = (min: number) => new Date(startsAt.getTime() + min * 60_000);
  it("opens 10 minutes early and closes 15 minutes after the planned end", () => {
    const s = { startsAt, durationMin: 60 };
    expect(sessionPhase(at(-11), s)).toBe("upcoming");
    expect(sessionPhase(at(-10), s)).toBe("joinable");
    expect(sessionPhase(at(75), s)).toBe("joinable");
    expect(sessionPhase(at(76), s)).toBe("ended");
  });
  it("cancelled wins over time", () => expect(sessionPhase(at(0), { startsAt, durationMin: 60, cancelled: true })).toBe("cancelled"));
});

describe("Baku time", () => {
  it("converts form values on the UTC+4 clock", () => {
    expect(parseBakuLocal("2026-11-20T18:30")?.toISOString()).toBe("2026-11-20T14:30:00.000Z");
    expect(toBakuInput(new Date("2026-11-20T14:30:00Z"))).toBe("2026-11-20T18:30");
  });
  it("rejects malformed and impossible dates", () => {
    expect(parseBakuLocal("2026-02-31T10:00")).toBeNull();
    expect(parseBakuLocal("tomorrow")).toBeNull();
    expect(parseBakuLocal("2026-11-20 18:30")).toBeNull();
  });
});

describe("validateSchedule", () => {
  const now = new Date("2026-11-20T10:00:00Z");
  it("flags past times, bad duration and short titles", () => {
    const e = validateSchedule({ title: "ab", startsAt: new Date("2026-11-19T10:00:00Z"), durationMin: 5 }, now);
    expect(Object.keys(e).sort()).toEqual(["durationMin", "startsAt", "title"]);
  });
  it("allows a past start when editing a session that already ran", () => {
    expect(validateSchedule({ title: "Riyaziyyat", startsAt: new Date("2026-11-19T10:00:00Z"), durationMin: 60 }, now, true)).toEqual({});
  });
});
