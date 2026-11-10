import "dotenv/config";
import { Pool } from "pg";

// Quick diagnosis for "Failed query" errors: connection, migrations, seed.
(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) return console.error("✗ DATABASE_URL .env faylında yoxdur");
  console.log("DB:", url.replace(/:[^:@/]*@/, ":***@"));
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query("select 1");
    console.log("✓ Postgres-ə qoşulma işləyir");
    const t = await pool.query("select to_regclass('public.users') as users");
    if (!t.rows[0].users) return console.error("✗ 'users' cədvəli yoxdur → npm run db:migrate");
    console.log("✓ Cədvəllər var");
    const c = await pool.query("select count(*)::int n from users");
    console.log(c.rows[0].n ? `✓ ${c.rows[0].n} istifadəçi` : "✗ Baza boşdur → npm run db:seed");
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    console.error("✗ Xəta:", err.code ?? "", err.message || String(e));
    if (err.code === "ECONNREFUSED") console.error("  Postgres işləmir (və ya port səhvdir).");
    if (err.code === "28P01") console.error("  Parol/istifadəçi səhvdir (.env).");
    if (err.code === "3D000") console.error("  Baza yoxdur → CREATE DATABASE mh_academy;");
  } finally {
    await pool.end();
  }
})();
