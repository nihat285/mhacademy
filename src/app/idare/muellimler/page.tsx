import type { Metadata } from "next";
import { one } from "@/components/catalog/params";
import { UsersView } from "@/components/admin/users-view";
import { PageHeader } from "@/components/panel/shell";
import { requireRole } from "@/lib/auth";
import { listUsers } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Müəllimlər" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  await requireRole(["admin"], "/idare/muellimler");
  const sp = await searchParams;
  const q = one(sp.q) ?? "";
  const status = one(sp.status) ?? "";
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const data = await listUsers({ role: "teacher", q: q || undefined, status, page });
  return (
    <>
      <PageHeader title="Müəllimlər" intro="Müəllim hesabları. İcazələri və fənləri “İdarə et” səhifəsində verin." />
      <UsersView {...data} basePath="/idare/muellimler" page={page} q={q} status={status} role="teacher" />
    </>
  );
}
