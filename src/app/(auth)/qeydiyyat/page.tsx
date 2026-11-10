import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions/auth";
import { homeFor } from "@/components/site/header";
import { ActionForm, CheckField, Field, SelectField, SubmitButton } from "@/components/ui/action-form";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Qeydiyyat" };

const GRADES = [{ value: "", label: "Seçin (könüllü)" }, ...Array.from({ length: 11 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}-ci sinif` }))];

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <div className="rise">
      <h1 className="text-3xl font-semibold">Hesab yaradın</h1>
      <p className="mt-2 text-muted">Şagird hesabı ilə sınaqlara qatılın və irəliləyişinizi izləyin.</p>
      <ActionForm action={registerAction} className="mt-7 space-y-4">
        <Field name="name" label="Ad və soyad" autoComplete="name" required />
        <Field name="email" label="E-poçt" type="email" autoComplete="email" required />
        <SelectField name="grade" label="Sinif" options={GRADES} />
        <Field name="password" label="Şifrə" type="password" autoComplete="new-password" hint="Ən azı 10 simvol; hərf və rəqəm daxil olmalıdır." required />
        <Field name="passwordConfirm" label="Şifrənin təkrarı" type="password" autoComplete="new-password" required />
        <CheckField name="terms" label="Qaydalar və məxfilik siyasəti ilə razıyam" />
        <p className="text-xs text-muted">
          <Link href="/qaydalar" className="underline" target="_blank">İstifadə qaydaları</Link> · <Link href="/mexfilik" className="underline" target="_blank">Məxfilik siyasəti</Link>
        </p>
        <SubmitButton className="w-full" size="lg" pendingText="Yaradılır…">Qeydiyyatdan keç</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        Artıq hesabınız var?{" "}
        <Link href="/giris" className="font-semibold text-accent-ink hover:underline">Daxil olun</Link>
      </p>
    </div>
  );
}
