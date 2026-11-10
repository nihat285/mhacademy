/**
 * Postgres quraşdırmadan işləmək üçün: PGlite (fayl kimi işləyən Postgres) qaldırır,
 * ilk dəfə cədvəlləri yaradıb demo datanı doldurur, sonra `next dev` başladır.
 *
 *   npm run dev:local
 *
 * Data `.data/pglite` qovluğunda saxlanır (silsən, baza sıfırlanır).
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { mkdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const require = createRequire(import.meta.url);
const root = process.cwd();
const dataDir = path.join(root, ".data", "pglite");
const url = new URL(process.env.DATABASE_URL ?? "postgresql://mh:mh@localhost:5432/mh_academy");
const port = Number(url.port || 5432);

// "localhost" can resolve to ::1 on Windows while the embedded server listens on IPv4 only.
const dbUrl = new URL(url);
if (dbUrl.hostname === "localhost") dbUrl.hostname = "127.0.0.1";

function run(args: string[], env: Record<string, string> = {}) {
  return spawn(process.execPath, args, { stdio: "inherit", cwd: root, env: { ...process.env, DATABASE_URL: dbUrl.toString(), ...env } });
}
const exited = (p: ReturnType<typeof run>) => new Promise<number>((res) => p.on("exit", (c) => res(c ?? 1)));

async function main() {
  console.log("▶ Yerli baza (PGlite) açılır…");
  mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir);
  await client.waitReady;

  await migrate(drizzle(client), { migrationsFolder: path.join(root, "drizzle") });
  const { rows } = await client.query<{ n: number }>("select count(*)::int as n from users");
  const needsSeed = rows[0].n === 0;
  const scores = await client.query<{ n: number }>("select count(*)::int as n from admission_scores");
  // Re-import whenever the data file and the table disagree (e.g. a new group was added to the JSON).
  const expected = (JSON.parse(readFileSync(path.join(root, "scripts", "data", "admission-scores-2026.json"), "utf8")) as unknown[]).length;
  const needsScores = scores.rows[0].n !== expected;

  const server = new PGLiteSocketServer({ db: client, port, host: "127.0.0.1", maxConnections: 10 });
  try {
    await server.start();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EADDRINUSE") {
      console.error(`✗ ${port} portu məşğuldur (başqa Postgres və ya əvvəlki dev:local işləyir). Onu bağla və yenidən cəhd et.`);
    } else console.error(e);
    process.exit(1);
  }
  console.log(`✓ Baza hazırdır: 127.0.0.1:${port}`);

  const tsx = require.resolve("tsx/cli");
  if (needsSeed) {
    console.log("▶ İlk dəfədir: demo data doldurulur…");
    const code = await exited(run([tsx, "scripts/seed.ts"], { DB_POOL_MAX: "1" }));
    if (code !== 0) console.error("✗ Seed uğursuz oldu (yuxarıdakı xətaya bax).");
  }

  if (needsScores) {
    console.log("▶ İxtisas balları (DİM 2026) yüklənir…");
    const code = await exited(run([tsx, "scripts/import-scores.ts"], { DB_POOL_MAX: "1" }));
    if (code !== 0) console.error("✗ İxtisas ballarının yüklənməsi uğursuz oldu.");
  }

  const next = run([require.resolve("next/dist/bin/next"), "dev"], { DB_POOL_MAX: "1" });
  const stop = async (code: number) => {
    await server.stop().catch(() => {});
    await client.close().catch(() => {});
    process.exit(code);
  };
  process.on("SIGINT", () => next.kill("SIGINT"));
  process.on("SIGTERM", () => next.kill("SIGTERM"));
  next.on("exit", (c) => void stop(c ?? 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
