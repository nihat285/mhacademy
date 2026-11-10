import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy-950 p-12 text-white lg:flex">
        <div aria-hidden className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl" />
        <Logo inverted />
        <div className="relative max-w-md">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gold-400">Akademik mükəmməllik</p>
          <h2 className="text-4xl font-semibold leading-tight text-white">Hər sınaq — daha dəqiq bir addım.</h2>
          <p className="mt-4 text-white/70">
            Zaman məhdudiyyətli sınaqlar, səhvlərin ətraflı təhlili və hər mövzu üzrə tövsiyə olunan video dərslər — bir hesabda.
          </p>
        </div>
        <p className="relative text-sm text-white/50">© MH Academy</p>
      </aside>
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-5 sm:px-8">
          <div className="lg:hidden"><Logo /></div>
          <Link href="/" className="hidden text-sm text-muted hover:text-text lg:block">← Ana səhifə</Link>
          <ThemeToggle />
        </div>
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16 sm:px-0">{children}</main>
      </div>
    </div>
  );
}
