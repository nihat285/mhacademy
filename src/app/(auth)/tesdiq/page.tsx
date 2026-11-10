import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { consumeVerificationToken } from "@/app/actions/auth";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "E-poçtun təsdiqi", robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await consumeVerificationToken(token) : false;
  return (
    <div className="rise text-center">
      {ok ? <CheckCircle2 className="mx-auto text-success" size={48} /> : <XCircle className="mx-auto text-danger" size={48} />}
      <h1 className="mt-4 text-3xl font-semibold">{ok ? "E-poçt təsdiqləndi" : "Bağlantı etibarsızdır"}</h1>
      <p className="mt-2 text-muted">
        {ok ? "Hesabınız təsdiqləndi. Təşəkkür edirik!" : "Bağlantının müddəti bitib və ya artıq istifadə olunub. Panelinizdən yeni təsdiq bağlantısı sifariş edə bilərsiniz."}
      </p>
      <Link href={ok ? "/panel" : "/giris"} className={buttonClasses("primary", "md", "mt-6")}>{ok ? "Panelə keç" : "Girişə keç"}</Link>
    </div>
  );
}
