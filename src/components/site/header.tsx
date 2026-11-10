import { LayoutDashboard, Search } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DesktopNavLinks, MobileNav } from "./mobile-nav";

export const homeFor = (role: string) => (role === "admin" ? "/idare" : role === "teacher" ? "/muellim" : "/panel");

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-[65px] max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
        <Logo />
        <DesktopNavLinks />
        <div className="flex items-center gap-1.5">
          <Link href="/axtaris" aria-label="Axtarış" className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface-2 2xl:hidden"><Search size={18} /></Link>
          <form action="/axtaris" role="search" className="hidden 2xl:block">
            <label className="relative block">
              <span className="sr-only">Saytda axtar</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input name="q" type="search" placeholder="Axtar…" className="h-10 w-40 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm focus:w-56 focus:border-accent focus:outline-none transition-all" />
            </label>
          </form>
          <ThemeToggle />
          {user ? (
            <Link href={homeFor(user.role)} className={buttonClasses("primary", "sm", "hidden sm:inline-flex")}>
              <LayoutDashboard size={16} /> Panelim
            </Link>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/giris" className={buttonClasses("ghost", "sm")}>
                Giriş
              </Link>
              <Link href="/qeydiyyat" className={buttonClasses("primary", "sm")}>
                Qeydiyyat
              </Link>
            </div>
          )}
          <MobileNav authed={!!user} />
        </div>
      </div>
    </header>
  );
}
