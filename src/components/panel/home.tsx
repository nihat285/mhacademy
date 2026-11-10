import Link from "next/link";
import { Card, StatTile } from "@/components/ui/card";
import { ROLE_LABEL } from "@/lib/format";
import type { CurrentUser } from "@/lib/session";

/** Shared dashboard landing: greeting, headline numbers and shortcuts. Role pages feed it their own data. */
export function DashboardHome({ user, stats, links, note }: { user: CurrentUser; stats: { label: string; value: number | string }[]; links: { href: string; label: string }[]; note?: string }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-ink">{ROLE_LABEL[user.role]}</p>
      <h1 className="mt-1 text-3xl font-semibold">Xoş gəldiniz</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} />
        ))}
      </div>
      <h2 className="mt-10 text-xl font-semibold">Qısayollar</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="group">
            <Card className="p-4 font-semibold transition group-hover:-translate-y-0.5 group-hover:shadow-pop">{l.label} →</Card>
          </Link>
        ))}
      </div>
      {note && <p className="mt-10 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{note}</p>}
    </div>
  );
}
