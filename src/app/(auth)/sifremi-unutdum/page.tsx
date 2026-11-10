import type { Metadata } from "next";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";

export const metadata: Metadata = { title: "Şifrənin bərpası" };

export default function ForgotPage() {
  return (
    <div className="rise">
      <h1 className="text-3xl font-semibold">Şifrəni bərpa edin</h1>
      <p className="mt-2 text-muted">E-poçt ünvanınızı daxil edin, şifrəni yeniləmək üçün bağlantı göndərək.</p>
      <ActionForm action={forgotPasswordAction} className="mt-7 space-y-4">
        <Field name="email" label="E-poçt" type="email" autoComplete="email" required />
        <SubmitButton className="w-full" size="lg" pendingText="Göndərilir…">Bağlantı göndər</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/giris" className="font-semibold text-accent-ink hover:underline">← Girişə qayıt</Link>
      </p>
    </div>
  );
}
