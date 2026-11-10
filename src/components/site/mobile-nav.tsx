"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "./nav-items";

export function DesktopNavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Əsas naviqasiya" className="hidden items-center gap-0.5 xl:flex">
      {/* The logo already links home, so "Ana səhifə" is only in the mobile menu and footer. */}
      {NAV_ITEMS.filter((item) => item.href !== "/").map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("rounded-lg px-2 py-2 text-sm font-semibold whitespace-nowrap transition hover:bg-surface-2", active ? "text-accent-ink" : "text-text")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ authed }: { authed: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close the menu on navigation (state adjusted during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <div className="xl:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Menyunu bağla" : "Menyunu aç"}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface-2"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-[65px] bottom-0 z-40 overflow-y-auto border-t border-border bg-bg p-5">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block rounded-xl px-4 py-3 text-lg font-semibold hover:bg-surface-2">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {!authed && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link href="/giris" className="rounded-xl border border-border-strong py-3 text-center font-semibold">
                Giriş
              </Link>
              <Link href="/qeydiyyat" className="rounded-xl bg-accent py-3 text-center font-semibold text-on-accent">
                Qeydiyyat
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
