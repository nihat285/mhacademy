/**
 * Imports the yearly admission scores (scripts/data/admission-scores-<year>.json) into the database.
 *   npm run db:import-scores            # default year 2026
 *   npm run db:import-scores -- 2026
 * Re-running replaces that year's rows.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { admissionScores } from "../src/db/schema";

type Row = {
  year: number; group: number; lang: string; university: string; code: string; name: string; form: string; special: number;
  scoreText: string | null; stateText: string | null; paidOnly: boolean; score: number | null; stateScore: number | null;
  subScore: string | null; subState: string | null;
};

export async function importScores(year = 2026) {
  const file = path.join(process.cwd(), "scripts", "data", `admission-scores-${year}.json`);
  const rows = JSON.parse(readFileSync(file, "utf8")) as Row[];
  await db.transaction(async (tx) => {
    await tx.delete(admissionScores).where(eq(admissionScores.year, year));
    for (let i = 0; i < rows.length; i += 200) {
      await tx.insert(admissionScores).values(
        rows.slice(i, i + 200).map((r, j) => ({
          sortOrder: i + j + 1,
          year: r.year, groupNo: r.group, lang: r.lang, university: r.university, code: r.code, name: r.name, studyForm: r.form,
          special: r.special, scoreText: r.scoreText, stateText: r.stateText, paidOnly: r.paidOnly,
          score: r.score === null ? null : String(r.score), stateScore: r.stateScore === null ? null : String(r.stateScore),
          subScore: r.subScore, subState: r.subState,
        })),
      );
    }
  });
  return rows.length;
}

if (process.argv[1]?.includes("import-scores")) {
  const year = Number(process.argv[2] ?? 2026);
  importScores(year)
    .then(async (n) => {
      console.log(`Imported ${n} admission score rows for ${year}.`);
      const { pool } = await import("../src/db");
      await pool.end();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
