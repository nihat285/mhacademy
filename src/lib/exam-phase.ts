export type ExamPhase = "upcoming" | "live" | "ended";

export function examPhase(exam: { startsAt: Date; endsAt: Date }, now = new Date()): ExamPhase {
  if (now < exam.startsAt) return "upcoming";
  if (now > exam.endsAt) return "ended";
  return "live";
}

export const PHASE_LABEL: Record<ExamPhase, string> = { upcoming: "Tezliklə", live: "Davam edir", ended: "Bitib" };
export const PHASE_TONE = { upcoming: "info", live: "success", ended: "neutral" } as const;
