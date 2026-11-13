import Link from "next/link";
import { Bell, ExternalLink, LogOut } from "lucide-react";
import { Suspense } from "react";
import { and, count, eq, isNull } from "drizzle-orm";
import { logoutAction } from "@/app/actions/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ROLE_LABEL } from "@/lib/format";
import { unreadTotal } from "@/lib/queries/chat";
import type { CurrentUser } from "@/lib/session";
import { PanelNav, type PanelNavItem } from "./panel-nav";

async function Bell_({ userId }: { userId: string }) {
  const [{ n }] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return (
    <Link href="/panel/bildirisler" aria-label={n ? `${n} oxunmamış bildiriş` : "Bildirişlər"} className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface-2">
      <Bell size={18} />
      {n > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">{n > 9 ? "9+" : n}</span>}
    </Link>
  );
}

/** Common frame for the student, teacher and admin areas. Auth is enforced by each area's layout, never here. */
export async function PanelShell({ user, items: baseItems, children }: { user: CurrentUser; items: PanelNavItem[]; children: React.ReactNode }) {
  const unread = await unreadTotal(user);
  const items = baseItems.map((i) => (i.href.endsWith("/yazisma") && unread > 0 ? { ...i, badge: unread } : i));
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="no-print hidden w-64 shrink-0 flex-col self-start overflow-y-auto border-r border-border bg-surface p-4 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="px-2 pb-5 pt-1"><Logo /></div>
        <PanelNav items={items} orientation="vertical" />
        <div className="mt-auto space-y-2 border-t border-border pt-4">
          <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text"><ExternalLink size={16} /> Sayta qayıt</Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
            <div className="lg:hidden"><Logo /></div>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="text-xs text-muted">{ROLE_LABEL[user.role]}</p>
            </div>
            <div className="flex items-center gap-1">
              {user.role === "student" && <Suspense fallback={<span className="h-10 w-10" />}><Bell_ userId={user.id} /></Suspense>}
              <ThemeToggle />
              <form action={logoutAction}>
                <button type="submit" aria-label="Çıxış" title="Çıxış" className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-surface-2">
                  <LogOut size={17} /> <span className="hidden sm:inline">Çıxış</span>
                </button>
              </form>
            </div>
          </div>
          <div className="border-t border-border lg:hidden"><PanelNav items={items} orientation="horizontal" /></div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, intro, actions }: { title: string; intro?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {intro && <p className="mt-1.5 max-w-2xl text-muted">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
