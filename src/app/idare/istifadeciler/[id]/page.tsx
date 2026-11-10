import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { resetUserPassword, setUserPermissions, setUserRole, setUserStatus } from "@/app/actions/admin";
import { ResetPassword } from "@/components/admin/reset-password";
import { PageHeader } from "@/components/panel/shell";
import { ActionForm, SelectField, SubmitButton } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { requireRole } from "@/lib/auth";
import { formatDateTime, ROLE_LABEL } from "@/lib/format";
import { PERMISSIONS } from "@/lib/permissions";
import { allSubjects, getUserDetail } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "İstifadəçi" };

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireRole(["admin"], `/idare/istifadeciler/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const [u, subjects] = await Promise.all([getUserDetail(id), allSubjects()]);
  if (!u) notFound();
  const isSelf = u.id === me.id;
  const back = u.role === "teacher" ? "/idare/muellimler" : "/idare/sagirdler";
  return (
    <>
      <PageHeader
        title={u.name}
        intro={u.email}
        actions={<LinkButton href={back} variant="outline">← Siyahı</LinkButton>}
      />
      <div className="grid max-w-4xl gap-6">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gold">{ROLE_LABEL[u.role]}</Badge>
            <Badge tone={u.status === "active" ? "success" : "danger"}>{u.status === "active" ? "Aktiv" : "Dayandırılıb"}</Badge>
            {u.isDemo && <Badge tone="warning">Demo hesab</Badge>}
            {isSelf && <Badge>Bu sizsiniz</Badge>}
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">Son giriş</dt><dd className="font-medium">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</dd></div>
            <div><dt className="text-muted">Qeydiyyat</dt><dd className="font-medium">{formatDateTime(u.createdAt)}</dd></div>
            <div><dt className="text-muted">Sınaq cəhdləri</dt><dd className="font-medium">{u.attemptCount}</dd></div>
          </dl>
        </Card>

        <Card className="p-5 sm:p-6">
          <CardHeader title="Rol" subtitle="Rol dəyişəndə istifadəçinin bütün sessiyaları bağlanır." />
          {isSelf ? (
            <p className="text-sm text-muted">Öz rolunuzu dəyişə bilməzsiniz.</p>
          ) : (
            <ActionForm action={setUserRole.bind(null, id)} className="flex flex-wrap items-end gap-4">
              <SelectField name="role" label="Rol" defaultValue={u.role} options={[{ value: "student", label: "Şagird" }, { value: "teacher", label: "Müəllim" }, { value: "admin", label: "Administrator" }]} className="min-w-52" />
              <SubmitButton>Dəyiş</SubmitButton>
            </ActionForm>
          )}
        </Card>

        {u.role === "teacher" && (
          <Card className="p-5 sm:p-6">
            <CardHeader title="Müəllim icazələri və fənləri" subtitle="İcazəsi olmayan bölmələr müəllimin panelində bağlı qalır." />
            <ActionForm action={setUserPermissions.bind(null, id)} className="grid gap-5">
              <div className="grid gap-3">
                {(Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]).map((p) => (
                  <label key={p} className="flex cursor-pointer items-start gap-3 text-sm">
                    <input type="checkbox" name="perm" value={p} defaultChecked={u.permissions.includes(p)} className="mt-0.5 h-4 w-4 accent-[var(--gold-500)]" />
                    <span><span className="font-semibold">{PERMISSIONS[p]}</span><span className="block text-xs text-muted">{p}</span></span>
                  </label>
                ))}
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Tədris etdiyi fənlər</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {subjects.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-3 text-sm">
                      <input type="checkbox" name="subject" value={s.id} defaultChecked={u.subjectIds.includes(s.id)} className="h-4 w-4 accent-[var(--gold-500)]" />
                      {s.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div><SubmitButton>Yadda saxla</SubmitButton></div>
            </ActionForm>
          </Card>
        )}

        {!isSelf && (
          <Card className="p-5 sm:p-6">
            <CardHeader title="Hesab" />
            <div className="flex flex-wrap items-start gap-3">
              <ResetPassword action={resetUserPassword.bind(null, id)} />
              {u.status === "active" ? (
                <ConfirmButton action={setUserStatus.bind(null, id, "suspended")} title="Hesab dayandırılsın?" description="İstifadəçi daxil ola bilməyəcək." confirmLabel="Dayandır">Hesabı dayandır</ConfirmButton>
              ) : (
                <ConfirmButton action={setUserStatus.bind(null, id, "active")} variant="primary" title="Hesab aktivləşdirilsin?" confirmLabel="Aktivləşdir">Aktivləşdir</ConfirmButton>
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
