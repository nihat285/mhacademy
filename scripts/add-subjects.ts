/**
 * Adds the extra subjects (Tarix, Ədəbiyyat, İnformatika) to an existing database without touching other data.
 *   npm run db:add-subjects
 * Safe to re-run: subjects that already exist (same slug) are skipped.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "../src/db";
import { subjects } from "../src/db/schema";
import { SUBJECTS } from "./seed-data";

const EXTRA = ["tarix", "edebiyyat", "informatika"];

async function main() {
  const [{ n }] = await db.select({ n: sql<number>`coalesce(max(${subjects.sortOrder}), -1)::int` }).from(subjects);
  let order = n + 1;
  const rows = SUBJECTS.filter((s) => EXTRA.includes(s.slug)).map((s) => ({ ...s, sortOrder: order++ }));
  const added = await db.insert(subjects).values(rows).onConflictDoNothing({ target: subjects.slug }).returning({ slug: subjects.slug });
  console.log(added.length ? `Əlavə olundu: ${added.map((a) => a.slug).join(", ")}` : "Bu fənlər artıq mövcuddur.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
