import { and, asc, count, eq, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { admissionScores as t } from "@/db/schema";
import { escapeLike } from "./catalog";

export const ADMISSION_YEAR = 2026;
export const ADMISSION_PAGE_SIZE = 30;
export const ADMISSION_GROUPS = [1, 2, 3, 4, 5] as const;
export const ADMISSION_SORTS = ["pdf", "bal", "bal-az", "ad", "universitet"] as const;
export type AdmissionSort = (typeof ADMISSION_SORTS)[number];

export const GROUP_LABEL: Record<number, string> = { 1: "I qrup", 2: "II qrup", 3: "III qrup", 4: "IV qrup", 5: "V qrup" };
export const GROUP_HINT: Record<number, string> = {
  1: "Riyaziyyat, fizika, informatika və mühəndislik",
  2: "İqtisadiyyat, hüquq, texniki və s.",
  3: "Humanitar, dillər, tarix, hüquq",
  4: "Təbiət elmləri, tibb",
  5: "Yaradıcılıq və idman",
};

export interface AdmissionFilters {
  q?: string;
  group?: number;
  lang?: "az" | "ru";
  university?: string;
  form?: "full" | "part";
  /** The student's own score. */
  bal?: number;
  /** Which score the `bal` filter compares against. */
  tip: "dovlet" | "odenisli";
  sort: AdmissionSort;
  page: number;
}

function where(f: AdmissionFilters): SQL | undefined {
  const c: (SQL | undefined)[] = [eq(t.year, ADMISSION_YEAR)];
  if (f.group) c.push(eq(t.groupNo, f.group));
  if (f.lang) c.push(eq(t.lang, f.lang));
  if (f.university) c.push(eq(t.university, f.university));
  if (f.form) c.push(eq(t.studyForm, f.form));
  if (f.q) {
    const p = `%${escapeLike(f.q)}%`;
    c.push(or(ilike(t.name, p), ilike(t.university, p), ilike(t.code, p)));
  }
  if (f.bal !== undefined) c.push(lte(f.tip === "dovlet" ? t.stateScore : t.score, String(f.bal)));
  return and(...c);
}

export async function searchAdmissionScores(f: AdmissionFilters) {
  const w = where(f);
  const scoreCol = f.bal !== undefined && f.tip === "dovlet" ? t.stateScore : f.bal !== undefined ? t.score : sql`coalesce(${t.stateScore}, ${t.score})`;
  const order =
    f.sort === "pdf" ? [asc(t.groupNo), asc(t.lang), asc(t.sortOrder)]
    : f.sort === "ad" ? [asc(t.name), asc(t.university)]
    : f.sort === "universitet" ? [asc(t.university), asc(t.name)]
    : f.sort === "bal-az" ? [sql`${scoreCol} asc nulls last`, asc(t.name)]
    : [sql`${scoreCol} desc nulls last`, asc(t.name)];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(t)
      .where(w)
      .orderBy(...order, asc(t.code))
      .limit(ADMISSION_PAGE_SIZE)
      .offset((f.page - 1) * ADMISSION_PAGE_SIZE),
    db.select({ total: count() }).from(t).where(w),
  ]);
  return { rows, total };
}

export async function getAdmissionFacets() {
  const [groups, universities, [stats]] = await Promise.all([
    db.select({ group: t.groupNo, n: count() }).from(t).where(eq(t.year, ADMISSION_YEAR)).groupBy(t.groupNo).orderBy(asc(t.groupNo)),
    db.select({ name: t.university, n: count() }).from(t).where(eq(t.year, ADMISSION_YEAR)).groupBy(t.university).orderBy(asc(t.university)),
    db
      .select({ total: count(), universities: sql<number>`count(distinct ${t.university})::int`, top: sql<string | null>`max(${t.score})` })
      .from(t)
      .where(eq(t.year, ADMISSION_YEAR)),
  ]);
  return { groups, universities, stats };
}


