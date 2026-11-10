import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-1 flex-col items-center justify-center px-5 text-center">
      <Logo />
      <p className="mt-10 font-display text-7xl font-semibold text-accent-ink">404</p>
      <h1 className="mt-3 text-2xl font-semibold">Səhifə tapılmadı</h1>
      <p className="mt-2 text-muted">Axtardığınız səhifə mövcud deyil və ya köçürülüb.</p>
      <div className="mt-7 flex gap-3">
        <Link href="/" className={buttonClasses("primary", "md")}>Ana səhifə</Link>
        <Link href="/axtaris" className={buttonClasses("outline", "md")}>Axtarış</Link>
      </div>
    </main>
  );
}
