import Link from "next/link";
import type { ReactNode } from "react";
import { MarkWatermark, Signature } from "@/components/ui/logo";

/** Navy page banner used by the public catalog pages. */
export function PageHeader({ eyebrow, title, intro, crumbs, children }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; crumbs?: { href?: string; label: string }[]; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-navy-950 text-white">
      <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(48rem 20rem at 90% -20%, rgb(212 175 55 / 0.16), transparent 60%), radial-gradient(32rem 18rem at -10% 120%, rgb(39 64 113 / 0.5), transparent 60%)" }} />
      <MarkWatermark className="-bottom-10 right-[8%] hidden h-72 opacity-[0.045] sm:block" />
      <Signature className="right-5 top-5 h-12 w-14 sm:right-10 sm:top-8 sm:h-20 sm:w-24" />
      <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Səhifə yolu" className="mb-5 text-sm text-white/65">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.href ? (
                    <Link href={c.href} className="hover:text-white hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-white/90">
                      {c.label}
                    </span>
                  )}
                  {i < crumbs.length - 1 && <span aria-hidden>/</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gold-400">{eyebrow}</p>}
        <h1 className="max-w-3xl text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-base text-white/75 sm:text-lg">{intro}</p>}
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}

export function Block({ title, intro, action, children, id }: { title: string; intro?: ReactNode; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-12 first:mt-0" aria-labelledby={id ? `${id}-h` : undefined}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={id ? `${id}-h` : undefined} className="text-2xl font-semibold sm:text-3xl">
            {title}
          </h2>
          {intro && <p className="mt-1 max-w-2xl text-sm text-muted">{intro}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-14 ${className}`}>{children}</div>;
}
