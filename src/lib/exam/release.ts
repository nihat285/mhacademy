export type ResultRelease = "immediate" | "after_end" | "manual";

export interface ReleaseInfo {
  resultRelease: ResultRelease;
  endsAt: Date;
  resultsReleasedAt: Date | null;
}

/** Whether students may see scores and review material for an exam yet. Decided on the server only. */
export function isReleased(exam: ReleaseInfo, now = new Date()): boolean {
  switch (exam.resultRelease) {
    case "immediate":
      return true;
    case "after_end":
      return now >= exam.endsAt;
    case "manual":
      return exam.resultsReleasedAt !== null && exam.resultsReleasedAt <= now;
    default:
      return false;
  }
}

export const RELEASE_HINT: Record<ResultRelease, (endsAt: string) => string> = {
  immediate: () => "Nəticə təqdimdən dərhal sonra açıqlanır.",
  after_end: (endsAt) => `Nəticə sınaq pəncərəsi bitdikdən sonra (${endsAt}) açıqlanacaq.`,
  manual: () => "Nəticə müəllim tərəfindən açıqlanacaq.",
};

/** Calendar date (YYYY-MM-DD) in Baku, used for study streaks. */
export function bakuDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baku", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Next streak value given the previously recorded active day. */
export function nextStreak(prevDay: string | null, prevStreak: number, today: string): number {
  if (prevDay === today) return Math.max(1, prevStreak);
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  return prevDay === y.toISOString().slice(0, 10) ? prevStreak + 1 : 1;
}
