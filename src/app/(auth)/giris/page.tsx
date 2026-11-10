import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/ui/action-form";
import { getCurrentUser } from "@/lib/session";
import { safeNext } from "@/lib/validation";
import { homeFor } from "@/components/site/header";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; sifre?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNext(sp.next, homeFor(user.role)));
  const next = safeNext(sp.next, "");
  return (
    <div className="rise">
      <h1 className="text-3xl font-semibold">Xoş gəlmisiniz</h1>
      <p className="mt-2 text-muted">Hesabınıza daxil olun və öyrənməyə davam edin.</p>
      {sp.sifre === "yenilendi" && (
        <p role="status" className="mt-5 rounded-xl bg-success-bg px-4 py-3 text-sm font-medium text-success">
          Şifrəniz yeniləndi. İndi yeni şifrə ilə daxil ola bilərsiniz.
        </p>
      )}
      <ActionForm action={loginAction} className="mt-7 space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field name="email" label="E-poçt" type="email" autoComplete="email" required />
        <Field name="password" label="Şifrə" type="password" autoComplete="current-password" required />
        <div className="flex justify-end">
          <Link href="/sifremi-unutdum" className="text-sm font-semibold text-accent-ink hover:underline">Şifrəni unutmusunuz?</Link>
        </div>
        <SubmitButton className="w-full" size="lg" pendingText="Daxil olunur…">Daxil ol</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        Hesabınız yoxdur?{" "}
        <Link href="/qeydiyyat" className="font-semibold text-accent-ink hover:underline">Qeydiyyatdan keçin</Link>
      </p>
    </div>
  );
}
