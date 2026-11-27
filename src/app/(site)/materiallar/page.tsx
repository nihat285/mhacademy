import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { MaterialCard } from "@/components/materials/material-card";
import { GRADES, isUuid } from "@/lib/materials/rules";
import { listPublicMaterials, listSubjectOptions, PAGE_SIZE } from "@/lib/materials/service";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Materiallar",
  description: "Fənlər üzrə PDF konspektlər, düstur cədvəlləri və test toplusları. Fənn və sinfə görə axtarın, yükləyin.",
};
export const dynamic = "force-dynamic";

const field = "h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm";

export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ fen?: string; sinif?: string; q?: string }> }) {
  const sp = await searchParams;
  const subjectId = sp.fen && isUuid(sp.fen) ? sp.fen : undefined;
  const gradeN = Number(sp.sinif);
  const grade = Number.isInteger(gradeN) && gradeN >= 1 && gradeN <= 11 ? gradeN : undefined;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const [items, subjects, user] = await Promise.all([listPublicMaterials({ subjectId, grade, q }), listSubjectOptions(), getCurrentUser()]);
  const filtered = !!(subjectId || grade || q);
  return (
    <>
      <PageHeader eyebrow="Kitabxana" title="Materiallar" intro="Konspektlər, düstur cədvəlləri və test topluları. Fənni və sinfi seçin, lazım olanı yükləyin." />
      <Container>
        <form method="get" className="mb-8 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[1fr_12rem_9rem_auto]" role="search" aria-label="Materialları axtar">
          <input name="q" defaultValue={q} maxLength={80} placeholder="Axtar: başlıq və ya açar söz" aria-label="Axtarış" className={field} />
          <select name="fen" defaultValue={subjectId ?? ""} aria-label="Fənn" className={field}>
            <option value="">Bütün fənlər</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select name="sinif" defaultValue={grade ? String(grade) : ""} aria-label="Sinif" className={field}>
            <option value="">Bütün siniflər</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}-ci sinif</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="h-11 flex-1 rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent hover:brightness-105">Axtar</button>
            {filtered && <Link href="/materiallar" className="inline-flex h-11 items-center rounded-xl border border-border-strong px-4 text-sm font-semibold hover:bg-surface-2">Təmizlə</Link>}
          </div>
        </form>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong p-10 text-center">
            <p className="font-display text-xl font-semibold">{filtered ? "Axtarışa uyğun material tapılmadı" : "Hələ material əlavə olunmayıb"}</p>
            <p className="mt-1 text-sm text-muted">{filtered ? "Başqa söz və ya filtr yoxlayın." : "Tezliklə burada fənlər üzrə materiallar olacaq."}</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">{items.length} material{items.length >= PAGE_SIZE ? ` (ən yeni ${PAGE_SIZE}-i göstərilir, axtarışı daraldın)` : ""}</p>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => <li key={m.id} className="min-w-0"><MaterialCard m={m} signedIn={!!user} /></li>)}
            </ul>
          </>
        )}
      </Container>
    </>
  );
}
