/**
 * Creates (or promotes) the real administrator and, optionally, switches off the demo accounts.
 * Run it once after the first deploy, against the production database:
 *
 *   PowerShell:  $env:DATABASE_URL="..."; $env:DATABASE_SSL="true"
 *                $env:ADMIN_EMAIL="siz@example.com"; $env:ADMIN_NAME="Ad Soyad"; $env:ADMIN_PASSWORD="güclü-şifrə"
 *                npx tsx scripts/create-admin.ts --disable-demo
 *
 * The password is read from the environment (not from the command line, so it is not kept in shell history
 * arguments) and is stored only as an argon2 hash. --disable-demo suspends every account flagged is_demo.
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../src/db";
import { users } from "../src/db/schema";
import { hashPassword, passwordProblems } from "../src/lib/password";

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME ?? "").trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_EMAIL düzgün deyil.");
  if (name.length < 2) throw new Error("ADMIN_NAME ən azı 2 simvol olmalıdır.");
  const problem = passwordProblems(password);
  if (problem) throw new Error(`ADMIN_PASSWORD: ${problem}`);

  const passwordHash = await hashPassword(password);
  const [existing] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  if (existing) {
    await db.update(users).set({ role: "admin", status: "active", passwordHash, name, isDemo: false, emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, existing.id));
    console.log(`✓ ${email} administrator edildi, şifrə yeniləndi.`);
  } else {
    await db.insert(users).values({ email, name, role: "admin", status: "active", passwordHash, emailVerifiedAt: new Date() });
    console.log(`✓ Administrator yaradıldı: ${email}`);
  }

  if (process.argv.includes("--disable-demo")) {
    const res = await db.update(users).set({ status: "suspended", updatedAt: new Date() }).where(eq(users.isDemo, true)).returning({ id: users.id });
    console.log(`✓ ${res.length} demo hesab dayandırıldı.`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});
