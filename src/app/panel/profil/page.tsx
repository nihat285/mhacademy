import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { BadgeCheck, MailWarning } from "lucide-react";
import { db } from "@/db";
import { studentProfiles, studentSubjects, subjects, users } from "@/db/schema";
import { changePasswordAction, deleteAccountAction, removeAvatarAction, updateAvatarAction, updateProfileAction } from "@/app/actions/profile";
import { resendVerificationAction } from "@/app/actions/auth";
import { PageHeader } from "@/components/panel/shell";
import { ActionForm, CheckField, Field, SelectField, SubmitButton, TextArea } from "@/components/ui/action-form";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil" };

const GRADES = [{ value: "", label: "Seçilməyib" }, ...Array.from({ length: 11 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}-ci sinif` }))];

export default async function ProfilePage() {
  const user = await requireRole(["student"], "/panel/profil");
  const [[account], [profile], allSubjects, mine] = await Promise.all([
    db.select({ avatarUrl: users.avatarUrl, createdAt: users.createdAt }).from(users).where(eq(users.id, user.id)).limit(1),
    db.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id)).limit(1),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.sortOrder)),
    db.select({ id: studentSubjects.subjectId }).from(studentSubjects).where(eq(studentSubjects.studentId, user.id)),
  ]);
  const chosen = new Set(mine.map((m) => m.id));
  const initials = user.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader title="Profil" intro="Şəxsi məlumatlarınızı, öyrənmə məqsədlərinizi və hesab təhlükəsizliyini idarə edin." />

      <Card>
        <CardHeader title="Profil şəkli" />
        <div className="flex flex-wrap items-center gap-5 p-5">
          {account?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt={`${user.name} — profil şəkli`} className="h-20 w-20 rounded-full border border-border object-cover" />
          ) : (
            <div aria-hidden className="flex h-20 w-20 items-center justify-center rounded-full bg-brand font-display text-2xl font-semibold text-on-brand">{initials}</div>
          )}
          <div className="min-w-60 flex-1">
            <ActionForm action={updateAvatarAction} className="flex flex-wrap items-end gap-3">
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold">Yeni şəkil (PNG, JPEG, WebP · maks. 3 MB)</span>
                <input type="file" name="avatar" accept="image/png,image/jpeg,image/webp" required className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:font-semibold" />
              </label>
              <SubmitButton size="sm" pendingText="Yüklənir…">Yüklə</SubmitButton>
            </ActionForm>
            {account?.avatarUrl && (
              <form action={removeAvatarAction} className="mt-2">
                <button type="submit" className="text-sm font-semibold text-danger hover:underline">Şəkli sil</button>
              </form>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Şəxsi məlumatlar" />
        <ActionForm action={updateProfileAction} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Ad və soyad" defaultValue={user.name} required />
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="f-email">E-poçt</label>
              <input id="f-email" value={user.email} readOnly disabled className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3.5 text-[0.95rem] text-muted" />
              <p className="mt-1 flex items-center gap-1 text-xs">
                {user.emailVerified ? <><BadgeCheck size={14} className="text-success" /> <span className="text-success">Təsdiqlənib</span></> : <><MailWarning size={14} className="text-warning" /> <span className="text-warning">Təsdiqlənməyib</span></>}
              </p>
            </div>
            <SelectField name="grade" label="Sinif" options={GRADES} defaultValue={profile?.grade ? String(profile.grade) : ""} />
            <Field name="displayAlias" label="Lider cədvəlində təxəllüs" defaultValue={profile?.displayAlias ?? ""} maxLength={40} hint="Boş buraxsanız, adınızın yalnız ilk hərfləri göstərilir." />
          </div>
          <TextArea name="goals" label="Öyrənmə məqsədləriniz" defaultValue={profile?.goals ?? ""} maxLength={1000} placeholder="Məsələn: buraxılış imtahanında riyaziyyatdan 45+ bal toplamaq." />
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Maraqlandığınız fənlər</legend>
            {allSubjects.length === 0 ? (
              <p className="text-sm text-muted">Hələ fənn əlavə olunmayıb.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {allSubjects.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-2">
                    <input type="checkbox" name="subjects" value={s.id} defaultChecked={chosen.has(s.id)} className="h-4 w-4 accent-[var(--gold-500)]" />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <CheckField name="leaderboardOptIn" label="Sınaq lider cədvəllərində görünmək istəyirəm" hint="Standart olaraq gizlidir. Yalnız seçdiyiniz təxəllüs və ya qısaldılmış ad göstərilir; istənilən vaxt söndürə bilərsiniz." defaultChecked={profile?.leaderboardOptIn ?? false} />
          <SubmitButton pendingText="Yadda saxlanılır…">Yadda saxla</SubmitButton>
        </ActionForm>
      </Card>

      {!user.emailVerified && (
        <Card>
          <CardHeader title="E-poçtun təsdiqi" />
          <div className="p-5">
            <p className="mb-4 text-sm text-muted"><Badge tone="warning">Təsdiqlənməyib</Badge> &nbsp;{user.email} ünvanına göndərilən bağlantı ilə hesabınızı təsdiqləyin.</p>
            <ActionForm action={resendVerificationAction}><SubmitButton variant="outline" size="sm">Təsdiq bağlantısını yenidən göndər</SubmitButton></ActionForm>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Şifrəni dəyiş" subtitle="Dəyişiklikdən sonra digər cihazlardakı sessiyalar bağlanır." />
        <ActionForm action={changePasswordAction} className="space-y-4 p-5">
          <Field name="current" label="Cari şifrə" type="password" autoComplete="current-password" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="password" label="Yeni şifrə" type="password" autoComplete="new-password" hint="Ən azı 10 simvol; hərf və rəqəm daxil olmalıdır." required />
            <Field name="passwordConfirm" label="Yeni şifrənin təkrarı" type="password" autoComplete="new-password" required />
          </div>
          <SubmitButton pendingText="Dəyişdirilir…">Şifrəni dəyiş</SubmitButton>
        </ActionForm>
      </Card>

      <Card className="border-danger/30">
        <CardHeader title="Hesabı sil" subtitle="Bu əməliyyat geri qaytarılmır: nəticələriniz, qeydləriniz və bildirişləriniz silinir." />
        <ActionForm action={deleteAccountAction} className="flex flex-wrap items-end gap-3 p-5">
          <Field name="password" label="Təsdiq üçün şifrə" type="password" autoComplete="current-password" className="min-w-60 flex-1" required />
          <SubmitButton variant="danger" pendingText="Silinir…">Hesabımı həmişəlik sil</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
