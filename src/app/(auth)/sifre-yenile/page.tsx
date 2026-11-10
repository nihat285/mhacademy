import type { Metadata } from "next";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";

export const metadata: Metadata = { title: "Yeni şifrə", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="rise">
        <h1 className="text-3xl font-semibold">Bağlantı etibarsızdır</h1>
        <p className="mt-2 text-muted">Şifrə bərpası üçün e-poçtdakı bağlantıdan istifadə edin və ya yeni sorğu göndərin.</p>
        <Link href="/sifremi-unutdum" className="mt-6 inline-block font-semibold text-accent-ink hover:underline">Yeni sorğu göndər</Link>
      </div>
    );
  }
  return (
    <div className="rise">
      <h1 className="text-3xl font-semibold">Yeni şifrə təyin edin</h1>
      <ActionForm action={resetPasswordAction} className="mt-7 space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field name="password" label="Yeni şifrə" type="password" autoComplete="new-password" hint="Ən azı 10 simvol; hərf və rəqəm daxil olmalıdır." required />
        <Field name="passwordConfirm" label="Şifrənin təkrarı" type="password" autoComplete="new-password" required />
        <SubmitButton className="w-full" size="lg" pendingText="Yadda saxlanılır…">Şifrəni yenilə</SubmitButton>
      </ActionForm>
    </div>
  );
}
