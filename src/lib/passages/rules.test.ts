import { describe, expect, it } from "vitest";
import { isOwnAudioUrl, playsLeft, validatePassage } from "./rules";

const base = { title: "Dinləmə 1", subjectId: "", body: "", transcript: "", maxPlays: "", hasAudio: false };

describe("validatePassage", () => {
  it("needs text or audio", () => {
    const r = validatePassage(base);
    expect(r.ok).toBe(false);
  });
  it("accepts text only", () => {
    const r = validatePassage({ ...base, body: "Mətn" });
    expect(r.ok && r.data.body).toBe("Mətn");
  });
  it("accepts audio only with limit", () => {
    const r = validatePassage({ ...base, hasAudio: true, maxPlays: "2" });
    expect(r.ok && r.data.maxPlays).toBe(2);
  });
  it("rejects bad play limits", () => {
    for (const m of ["0", "11", "1.5", "abc"]) expect(validatePassage({ ...base, hasAudio: true, maxPlays: m }).ok).toBe(false);
  });
  it("rejects a limit without audio", () => {
    expect(validatePassage({ ...base, body: "x", maxPlays: "2" }).ok).toBe(false);
  });
  it("rejects a short title", () => {
    expect(validatePassage({ ...base, title: "ab", body: "x" }).ok).toBe(false);
  });
});

describe("playsLeft", () => {
  it("is null when unlimited and never negative", () => {
    expect(playsLeft(null, 5)).toBeNull();
    expect(playsLeft(2, 1)).toBe(1);
    expect(playsLeft(2, 9)).toBe(0);
  });
});


describe("isOwnAudioUrl", () => {
  it("accepts only our own upload paths", () => {
    expect(isOwnAudioUrl("/uploads/passage-audio/1730000000000-0123456789abcdef.mp3")).toBe(true);
    expect(isOwnAudioUrl("https://cdn.x.az/passage-audio/1-0123456789abcdef.ogg", "https://cdn.x.az/")).toBe(true);
    expect(isOwnAudioUrl("https://evil.com/a.mp3", "https://cdn.x.az")).toBe(false);
    expect(isOwnAudioUrl("/uploads/passage-audio/../../x.mp3")).toBe(false);
    expect(isOwnAudioUrl("/uploads/questions/1-0123456789abcdef.mp3")).toBe(false);
    expect(isOwnAudioUrl("javascript:alert(1)")).toBe(false);
  });
});
