import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Info } from "lucide-react";
import { FilterChips } from "@/components/catalog/filter-chips";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { one } from "@/components/catalog/params";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, selectClass, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import {
  ADMISSION_GROUPS,
  ADMISSION_PAGE_SIZE,
  ADMISSION_SORTS,
  ADMISSION_YEAR,
  getAdmissionFacets,
  GROUP_HINT,
  GROUP_LABEL,
  searchAdmissionScores,
  type AdmissionFilters,
  type AdmissionSort,
} from "@/lib/queries/admission";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: `İxtisas balları ${ADMISSION_YEAR}`,
  description: `${ADMISSION_YEAR}-ci il qəbul nəticələrinə görə ali məktəblərin ixtisaslar üzrə keçid balları: qrup, universitet və öz balınıza görə axtarış.`,
};

const SORT_LABEL: Record<AdmissionSort, string> = {
  pdf: "DİM nəşrindəki sıra (universitetlər üzrə)",
  bal: "Bal: yüksəkdən aşağıya",
  "bal-az": "Bal: aşağıdan yuxarıya",
  ad: "İxtisas adına görə",
  universitet: "Universitetə görə",
};
type SP = Promise<Record<string, string | string[] | undefined>>;
type Row = Awaited<ReturnType<typeof searchAdmissionScores>>["rows"][number];

/** "6/60" (special-ability exams) is shown as "6 / 60"; plain scores are left as published. */
const fmt = (t: string | null) => (t ? t.replace("/", " / ") : "—");

function StateScore({ r }: { r: Row }) {
  if (r.paidOnly) return <span className="text-xs text-muted">Yalnız ödənişli</span>;
  if (!r.stateText) return <span className="text-xs text-muted" title="Dövlət sifarişi ilə qəbul olan abituriyent olmayıb">Qəbul yoxdur</span>;
  return <span className="font-semibold tabular-nums">{fmt(r.stateText)}</span>;
}
function Overall({ r }: { r: Row }) {
  return r.scoreText ? <span className="font-semibold tabular-nums">{fmt(r.scoreText)}</span> : <span className="text-xs text-muted">—</span>;
}
function Tags({ r }: { r: Row }) {
  return (
    <>
      {r.special > 0 && <Badge tone="warning" title={r.special === 2 ? "Bal qabiliyyət imtahanı / test balı" : "Xüsusi qabiliyyət imtahanı tələb olunur"}>Qabiliyyət imtahanı</Badge>}
      {r.lang === "ru" && <Badge tone="info">Rus bölməsi</Badge>}
    </>
  );
}
function Sub({ r }: { r: Row }) {
  if (!r.subScore && !r.subState) return null;
  return (
    <p className="mt-1 text-xs text-muted">
      Subbakalavr: <span className="tabular-nums">{fmt(r.subScore)}</span> <span className="tabular-nums">({fmt(r.subState)})</span>
    </p>
  );
}

export default async function AdmissionScoresPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = one(sp.q, 80);
  const groupN = Number.parseInt(one(sp.qrup, 2) ?? "", 10);
  const group = (ADMISSION_GROUPS as readonly number[]).includes(groupN) ? groupN : undefined;
  const lang = one(sp.bolme, 2) === "ru" ? "ru" : one(sp.bolme, 2) === "az" ? "az" : undefined;
  const university = one(sp.univ, 240);
  const form = one(sp.forma, 5) === "full" ? "full" : one(sp.forma, 5) === "part" ? "part" : undefined;
  const balN = Number.parseFloat((one(sp.bal, 8) ?? "").replace(",", "."));
  const bal = Number.isFinite(balN) && balN >= 0 && balN <= 700 ? balN : undefined;
  const tip = one(sp.tip, 8) === "odenisli" ? "odenisli" : "dovlet";
  const sortRaw = one(sp.sirala, 12) ?? "";
  // Default: the order of the official DİM publication; once the student enters a score, rank by score instead.
  const defaultSort: AdmissionSort = bal !== undefined ? "bal" : "pdf";
  const explicitSort = (ADMISSION_SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as AdmissionSort) : undefined;
  const sort: AdmissionSort = explicitSort ?? defaultSort;
  const page = Math.min(500, Math.max(1, Number.parseInt(one(sp.page, 6) ?? "1", 10) || 1));

  const filters: AdmissionFilters = { q, group, lang, university, form, bal, tip, sort, page };
  const [facets, { rows, total }] = await Promise.all([getAdmissionFacets(), searchAdmissionScores(filters)]);
  const filtered = Boolean(q || lang || university || form || bal !== undefined);

  const params = {
    q, qrup: group ? String(group) : undefined, bolme: lang, univ: university, forma: form,
    bal: bal !== undefined ? String(bal) : undefined, tip: bal !== undefined ? tip : undefined, sirala: explicitSort,
  };
  const counts = new Map(facets.groups.map((g) => [g.group, g.n]));

  return (
    <>
      <PageHeader
        eyebrow={`Qəbul ${ADMISSION_YEAR}`}
        title="İxtisas balları"
        intro={`${formatNumber(facets.stats.universities)} ali təhsil müəssisəsində ${formatNumber(facets.stats.total)} ixtisasın ${ADMISSION_YEAR}-ci il keçid balları. Öz balınızı yazın, hansı ixtisaslara çatdığınızı görün.`}
      >
        <FilterChips
          label="Qruplar"
          allHref="/ixtisas-ballari"
          allLabel="Bütün qruplar"
          active={group ? String(group) : undefined}
          items={ADMISSION_GROUPS.map((g) => ({ key: String(g), label: `${GROUP_LABEL[g]} · ${formatNumber(counts.get(g) ?? 0)}`, href: `/ixtisas-ballari?qrup=${g}` }))}
        />
        {group && <p className="mt-3 text-sm text-white/65">{GROUP_LABEL[group]}: {GROUP_HINT[group]}</p>}
      </PageHeader>

      <Container>
        <FilterBar action="/ixtisas-ballari" q={q} placeholder="İxtisas, universitet və ya kod…">
          {group && <input type="hidden" name="qrup" value={group} />}
          <select name="univ" defaultValue={university ?? ""} aria-label="Universitet" className={`${selectClass} max-w-64`}>
            <option value="">Bütün universitetlər</option>
            {facets.universities.map((u) => (
              <option key={u.name} value={u.name}>{u.name}</option>
            ))}
          </select>
          <select name="bolme" defaultValue={lang ?? ""} aria-label="Bölmə" className={selectClass}>
            <option value="">Bütün bölmələr</option>
            <option value="az">Azərbaycan bölməsi</option>
            <option value="ru">Rus bölməsi</option>
          </select>
          <select name="forma" defaultValue={form ?? ""} aria-label="Təhsil forması" className={selectClass}>
            <option value="">Əyani və qiyabi</option>
            <option value="full">Əyani</option>
            <option value="part">Qiyabi</option>
          </select>
          <label className="flex items-center gap-2">
            <span className="sr-only">Mənim balım</span>
            <input name="bal" type="number" inputMode="decimal" min={0} max={700} step="0.1" defaultValue={bal} placeholder="Balım (məs. 520)" className={`${selectClass} w-40`} />
          </label>
          <select name="tip" defaultValue={tip} aria-label="Balın müqayisə əsası" className={selectClass}>
            <option value="dovlet">Dövlət sifarişi üzrə</option>
            <option value="odenisli">Ümumi keçid balı üzrə</option>
          </select>
          <select name="sirala" defaultValue={explicitSort ?? ""} aria-label="Sıralama" className={selectClass}>
            <option value="">Standart sıra (DİM nəşri; bal yazanda bal üzrə)</option>
            {ADMISSION_SORTS.map((s) => (
              <option key={s} value={s}>{SORT_LABEL[s]}</option>
            ))}
          </select>
        </FilterBar>

        <p className="mb-4 flex flex-wrap items-center gap-x-3 text-sm text-muted" aria-live="polite">
          <span>
            <strong className="text-text">{formatNumber(total)}</strong> ixtisas tapıldı
            {bal !== undefined && <> · balınız <strong className="text-text">{bal}</strong> ilə {tip === "dovlet" ? "dövlət sifarişi" : "ümumi keçid balı"} baxımından çatdıqlarınız</>}
          </span>
          {(filtered || group) && (
            <Link href="/ixtisas-ballari" className="font-semibold text-accent-ink hover:underline">Filtrləri sıfırla</Link>
          )}
        </p>

        {rows.length === 0 ? (
          <EmptyState icon={<GraduationCap size={28} />} title="Uyğun ixtisas tapılmadı">
            Axtarışı genişləndirin və ya balı artırın.
          </EmptyState>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <TableWrap className="[&>table]:min-w-[56rem]">
                <THead>
                  <tr>
                    <Th>Kod</Th>
                    <Th>İxtisas</Th>
                    <Th>Universitet</Th>
                    <Th>Forma</Th>
                    <Th className="text-right">Ümumi keçid balı</Th>
                    <Th className="text-right">Dövlət sifarişi</Th>
                  </tr>
                </THead>
                <tbody>
                  {rows.map((r) => (
                    <Tr key={r.id}>
                      <Td className="font-mono text-xs text-muted tabular-nums">
                        {r.code}
                        <span className="mt-0.5 block font-sans text-[10px] uppercase tracking-wide">{r.lang === "ru" ? "Rus böl." : "Az. böl."}</span>
                      </Td>
                      <Td className="max-w-md">
                        <div className="font-semibold leading-snug">{r.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5 empty:hidden"><Tags r={r} /></div>
                        <Sub r={r} />
                      </Td>
                      <Td className="max-w-60 text-muted">{r.university}</Td>
                      <Td className="whitespace-nowrap">{r.studyForm === "full" ? "Əyani" : "Qiyabi"}</Td>
                      <Td className="text-right"><Overall r={r} /></Td>
                      <Td className="text-right"><StateScore r={r} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>

            {/* Mobile cards */}
            <ul className="grid gap-3 md:hidden">
              {rows.map((r) => (
                <li key={r.id}>
                  <Card className="p-4">
                    <p className="text-xs text-muted">{r.university}</p>
                    <h3 className="mt-1 text-base font-semibold leading-snug">{r.name}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge>{r.studyForm === "full" ? "Əyani" : "Qiyabi"}</Badge>
                      <Tags r={r} />
                      <span className="font-mono text-xs text-muted">{r.code}</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted">Ümumi keçid balı</dt>
                        <dd className="mt-0.5 text-lg"><Overall r={r} /></dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Dövlət sifarişi</dt>
                        <dd className="mt-0.5 text-lg"><StateScore r={r} /></dd>
                      </div>
                    </dl>
                    <Sub r={r} />
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}

        <Pagination page={page} total={total} pageSize={ADMISSION_PAGE_SIZE} basePath="/ixtisas-ballari" params={params} />

        <Card className="mt-10 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-sans text-base font-bold">
            <Info size={18} className="text-accent-ink" /> Cədvəli necə oxumalı
          </h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <li><strong className="text-text">Ümumi keçid balı</strong> — ixtisasa qəbul olan abituriyentlər arasında ən aşağı bal.</li>
            <li><strong className="text-text">Dövlət sifarişi</strong> — dövlət sifarişi əsasında qəbulun keçid balı. <em>Qəbul yoxdur</em> o deməkdir ki, dövlət sifarişi ilə təhsil hüququ qazanan olmayıb; <em>Yalnız ödənişli</em> — ixtisas yalnız ödənişli əsaslarla təklif olunub.</li>
            <li><strong className="text-text">Qabiliyyət imtahanı</strong> olan ixtisaslarda bal “6 / 60” kimi verilir: surətdə qabiliyyət imtahanı, məxrəcdə həmin abituriyentin test balı. Balını yazanda müqayisə test balına görə aparılır.</li>
            <li><strong className="text-text">Subbakalavr</strong> sətri ixtisasın altında ayrıca göstərilən subbakalavr qəbulunun balıdır.</li>
          </ul>
          <p className="mt-4 text-xs text-muted">
            Mənbə: Dövlət İmtahan Mərkəzinin {ADMISSION_YEAR}-ci il qəbul nəticələri nəşri (I, II, III, IV və V qrup). Qərar verməzdən əvvəl rəsmi mənbə olan abiturient.az saytında yoxlayın; keçid balları hər il dəyişir.
          </p>
        </Card>
      </Container>
    </>
  );
}
