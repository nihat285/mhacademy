import type { Metadata } from "next";
import { deleteAttempt, releaseResults } from "@/app/actions/admin";
import { one } from "@/components/catalog/params";
import { PageHeader } from "@/components/panel/shell";
import { Badge, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Pagination } from "@/components/ui/pagination";
import { selectClass, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDateTime, formatPercent } from "@/lib/format";
import { listAllExams, listAttempts } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Nəticələr" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ResultsAdmin({ searchParams }: { searchParams: SP }) {
  await requireRole(["admin"], "/idare/neticeler");
  const sp = await searchParams;
  const exam = one(sp.sinaq) ?? "";
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const examId = /^[0-9a-f-]{36}$/i.test(exam) ? exam : undefined;
  const [exams, { rows, total }] = await Promise.all([listAllExams(), listAttempts({ examId, page })]);
  const manual = exams.filter((e) => e.resultRelease === "manual" && !e.resultsReleasedAt && e.attempts > 0);
  return (
    <>
      <PageHeader title="Nəticələr" intro="Təqdim olunmuş sınaq cəhdləri." />
      {manual.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 text-sm font-semibold">Əl ilə açılması gözlənilən nəticələr</p>
          <div className="flex flex-wrap gap-3">
            {manual.map((e) => (
              <div key={e.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                <span>{e.title} · {e.attempts} cəhd</span>
                <ConfirmButton action={releaseResults.bind(null, e.id)} variant="primary" title="Nəticələr açılsın?" description="Şagirdlər nəticələrini və izahları görəcək." confirmLabel="Aç">Nəticələri aç</ConfirmButton>
              </div>
            ))}
          </div>
        </div>
      )}
      <form action="/idare/neticeler" className="mb-5 flex gap-2">
        <select name="sinaq" defaultValue={exam} className={selectClass} aria-label="Sınaq">
          <option value="">Bütün sınaqlar</option>
          {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <button type="submit" className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:opacity-90">Filtrlə</button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="Nəticə tapılmadı" />
      ) : (
        <TableWrap>
          <THead><tr><Th>Şagird</Th><Th>Sınaq</Th><Th>Cəhd</Th><Th>Nəticə</Th><Th>Tarix</Th><Th className="text-right">Əməliyyat</Th></tr></THead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="font-semibold">{r.student}<span className="block text-xs font-normal text-muted">{r.email}</span></Td>
                <Td>{r.exam}</Td>
                <Td>{r.attemptNo}</Td>
                <Td>
                  {r.percentage == null ? "—" : formatPercent(Number(r.percentage))}{" "}
                  {r.passed != null && <Badge tone={r.passed ? "success" : "danger"}>{r.passed ? "Keçdi" : "Keçmədi"}</Badge>}
                </Td>
                <Td className="whitespace-nowrap text-xs">{r.submittedAt ? formatDateTime(r.submittedAt) : "—"}</Td>
                <Td className="text-right">
                  <ConfirmButton action={deleteAttempt.bind(null, r.id)} title="Cəhd silinsin?" description="Cəhd və cavabları silinir. Şagirdin cəhd limiti geri qayıdır." confirmLabel="Sil">Sil</ConfirmButton>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} total={total} basePath="/idare/neticeler" params={{ sinaq: exam }} />
    </>
  );
}
