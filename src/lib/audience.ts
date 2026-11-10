export type Audience = "all" | "students" | "teachers" | "class";

export const AUDIENCE_LABEL: Record<Audience, string> = {
  all: "Hamı",
  students: "Şagirdlər",
  teachers: "Müəllimlər",
  class: "Sinif",
};

export const AUDIENCES = Object.keys(AUDIENCE_LABEL) as Audience[];

/** Roles that receive an announcement. A class announcement only ever reaches students (class members). */
export function audienceRoles(audience: Audience): ("student" | "teacher")[] {
  switch (audience) {
    case "all":
      return ["student", "teacher"];
    case "students":
    case "class":
      return ["student"];
    case "teachers":
      return ["teacher"];
  }
}

/** Splits a list into batches (used to keep multi-row inserts ≤ 500 rows). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new Error("chunk size must be positive");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
