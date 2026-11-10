import Link from "next/link";
import { cn } from "@/lib/cn";

export function FilterChips({ items, active, allHref, allLabel = "Hamısı", label }: { items: { href: string; label: string; key: string }[]; active?: string; allHref: string; allLabel?: string; label: string }) {
  const chip = (isActive: boolean) =>
    cn(
      "inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold transition",
      isActive ? "border-accent bg-accent text-on-accent" : "border-white/25 text-white/85 hover:bg-white/10",
    );
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link href={allHref} className={chip(!active)} aria-current={!active ? "true" : undefined}>
            {allLabel}
          </Link>
        </li>
        {items.map((i) => (
          <li key={i.key}>
            <Link href={i.href} className={chip(active === i.key)} aria-current={active === i.key ? "true" : undefined}>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
