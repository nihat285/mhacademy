import Link from "next/link";
import { setUserStatus } from "@/app/actions/admin";
import { NewUserForm } from "@/components/admin/new-user-form";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, selectClass, TableWrap, Td, Th, THead, Tr } from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import type { listUsers } from "@/lib/queries/admin";

type Rows = Awaited<ReturnType<typeof listUsers>>;

export function UsersView({ basePath, rows, total, page, q, status, role }: Rows & { basePath: string; page: number; q: string; status: string; role: "student" | "teacher" }) {
  return (
    <>
      <NewUserForm role={role} />
      <FilterBar action={basePath} q={q} placeholder="Ad və ya e-poçt…">
        <select name="status" defaultValue={status} className={selectClass} aria-label="Status">
          <option value="">Bütün statuslar</option>
          <option value="active">Aktiv</option>
          <option value="suspended">Dayandırılıb</option>
        </select>
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState title="İstifadəçi tapılmadı">Axtarışı və ya filtri dəyişin.</EmptyState>
      ) : (
        <TableWrap>
          <THead>
            <tr><Th>Ad</Th><Th>E-poçt</Th><Th>Status</Th><Th>Son giriş</Th><Th>Qeydiyyat</Th><Th className="text-right">Əməliyyat</Th></tr>
          </THead>
          <tbody>
            {rows.map((u) => (
              <Tr key={u.id}>
                <Td className="font-semibold">
                  <Link href={`/idare/istifadeciler/${u.id}`} className="hover:text-accent-ink">{u.name}</Link>
                  {u.isDemo && <Badge tone="warning" className="ml-2">Demo</Badge>}
                </Td>
                <Td>{u.email}</Td>
                <Td><Badge tone={u.status === "active" ? "success" : "danger"}>{u.status === "active" ? "Aktiv" : "Dayandırılıb"}</Badge></Td>
                <Td className="whitespace-nowrap text-xs">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(u.createdAt)}</Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <LinkButton href={`/idare/istifadeciler/${u.id}`} variant="outline" size="sm">İdarə et</LinkButton>
                    {u.status === "active" ? (
                      <ConfirmButton action={setUserStatus.bind(null, u.id, "suspended")} title="Hesab dayandırılsın?" description="İstifadəçi daxil ola bilməyəcək və açıq sessiyaları bağlanacaq." confirmLabel="Dayandır">Dayandır</ConfirmButton>
                    ) : (
                      <ConfirmButton action={setUserStatus.bind(null, u.id, "active")} variant="primary" title="Hesab aktivləşdirilsin?" confirmLabel="Aktivləşdir">Aktivləşdir</ConfirmButton>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} total={total} basePath={basePath} params={{ q, status }} />
    </>
  );
}
