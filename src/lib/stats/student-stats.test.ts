import { describe, expect, it } from "vitest";
import { buildStats, type AttemptRow } from "./student-stats";

const NOW = new Date("2026-11-20T12:00:00Z");
const att = (id: string, pct: number, subject: string, day: number, over: Partial<AttemptRow> = {}): AttemptRow => ({
  id, percentage: pct, correct: 6, incorrect: 3, unanswered: 1, subject, submittedAt: new Date(Date.UTC(2026, 10, day, 10)),
  release: { resultRelease: "immediate", endsAt: new Date("2026-11-01T00:00:00Z"), resultsReleasedAt: null }, ...over,
});

describe("buildStats", () => {
  it("derives trend, accuracy and subject averages from saved attempts only", () => {
    const s = buildStats([att("b", 80, "Riyaziyyat", 12), att("a", 60, "Riyaziyyat", 10), att("c", 90, "Fizika", 14)], [], NOW);
    expect(s.attempts).toBe(3);
    expect(s.trend.map((t) => t.score)).toEqual([60, 80, 90]); // chronological
    expect(s.accuracy).toEqual({ correct: 18, incorrect: 9, unanswered: 3 });
    expect(s.subjects).toEqual([{ name: "Fizika", value: 90 }, { name: "Riyaziyyat", value: 70 }]);
  });
  it("never counts results the exam has not released yet", () => {
    const hidden = att("h", 100, "Kimya", 15, { release: { resultRelease: "manual", endsAt: new Date("2026-11-30T00:00:00Z"), resultsReleasedAt: null } });
    const later = att("l", 95, "Kimya", 16, { release: { resultRelease: "after_end", endsAt: new Date("2026-11-25T00:00:00Z"), resultsReleasedAt: null } });
    const s = buildStats([hidden, later, att("ok", 50, "Riyaziyyat", 11)], [], NOW);
    expect(s.attempts).toBe(1);
    expect(s.subjects.map((x) => x.name)).toEqual(["Riyaziyyat"]);
  });
  it("keeps only the latest 8 points on the trend", () => {
    const many = Array.from({ length: 12 }, (_, i) => att(`x${i}`, 40 + i, "Riyaziyyat", i + 1));
    const s = buildStats(many, [], NOW);
    expect(s.attempts).toBe(12);
    expect(s.trend).toHaveLength(8);
    expect(s.trend.at(-1)?.score).toBe(51);
  });
  it("ranks weak topics by accuracy, ignores tiny samples and perfect topics", () => {
    const t = (topicId: string, total: number, wrong: number) => ({ topicId, topic: `Mövzu ${topicId}`, subject: "Riyaziyyat", total, wrong, lessonSlug: null });
    const s = buildStats([att("a", 70, "Riyaziyyat", 10)], [t("a", 10, 7), t("b", 4, 1), t("c", 2, 2), t("d", 5, 0), t("e", 6, 3), t("f", 8, 2)], NOW);
    expect(s.weakTopics.map((x) => x.topicId)).toEqual(["a", "e", "f"]); // 30%, 50%, 75% (tie with b: more mistakes first); c (2 answers) and d (no mistakes) excluded
    expect(s.weakTopics[0].accuracy).toBe(30);
  });
  it("is empty for a student with no results", () => {
    expect(buildStats([], [], NOW)).toMatchObject({ attempts: 0, trend: [], subjects: [], weakTopics: [] });
  });
});
