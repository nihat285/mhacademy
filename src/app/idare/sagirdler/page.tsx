import type { Metadata } from "next";
import { one } from "@/components/catalog/params";
import { UsersView } from "@/components/admin/users-view";
import { PageHeader } from "@/components/panel/shell";
import { requireRole } from "@/lib/auth";
import { listUsers } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Şagirdlər" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  await requireRole(["admin"], "/idare/sagirdler");
  const sp = await searchParams;
  const q = one(sp.q) ?? "";
  const status = one(sp.status) ?? "";
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const data = await listUsers({ role: "student", q: q || undefined, status, page });
  return (
    <>
      <PageHeader title="Şagirdlər" intro="Qeydiyyatlı şagirdlər." />
      <UsersView {...data} basePath="/idare/sagirdler" page={page} q={q} status={status} role="student" />
    </>
  );
}
