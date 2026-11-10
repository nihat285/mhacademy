import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { Bell, CheckCheck, Megaphone } from "lucide-react";
import { db } from "@/db";
import { announcements, classMembers, notifications, users } from "@/db/schema";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/profile";
import { PageHeader } from "@/components/panel/shell";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Bildirişlər" };
const PAGE_SIZE = 15;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireRole(["student"], "/panel/bildirisler");
  const page = Math.max(1, Number((await searchParams).page) || 1);

  const myClasses = await db.select({ id: classMembers.classId }).from(classMembers).where(eq(classMembers.studentId, user.id));
  const classIds = myClasses.map((c) => c.id);

  const [items, [{ total }], [{ unread }], notices] = await Promise.all([
    db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(notifications).where(eq(notifications.userId, user.id)),
    db.select({ unread: count() }).from(notifications).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
    db
      .select({ id: announcements.id, title: announcements.title, body: announcements.body, createdAt: announcements.createdAt, author: users.name })
      .from(announcements)
      .leftJoin(users, eq(users.id, announcements.authorId))
      .where(or(inArray(announcements.audience, ["all", "students"]), classIds.length ? and(eq(announcements.audience, "class"), inArray(announcements.classId, classIds)) : undefined))
      .orderBy(desc(announcements.createdAt))
      .limit(5),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bildirişlər"
        intro={unread ? `${unread} oxunmamış bildirişiniz var.` : "Bütün bildirişlər oxunub."}
        actions={
          unread > 0 && (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-surface-2"><CheckCheck size={16} /> Hamısını oxunmuş et</button>
            </form>
          )
        }
      />

      {notices.length > 0 && (
        <Card>
          <CardHeader title="Elanlar" />
          <ul className="divide-y divide-border">
            {notices.map((n) => (
              <li key={n.id} className="flex gap-3 p-5">
                <Megaphone size={18} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold">{n.title}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted">{n.body}</p>
                  <p className="mt-2 text-xs text-muted">{formatDateTime(n.createdAt)}{n.author ? ` · ${n.author}` : ""}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState icon={<Bell size={28} />} title="Hələ bildiriş yoxdur">Yeni sınaqlar, dərslər və nəticələr barədə xəbərlər burada görünəcək.</EmptyState>
      ) : (
        <>
          <Card>
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 p-5 ${n.readAt ? "" : "bg-accent/5"}`}>
                  <span aria-hidden className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-accent"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {n.href ? <Link href={n.href} className="hover:underline">{n.title}</Link> : n.title}
                      {!n.readAt && <Badge tone="gold">Yeni</Badge>}
                    </p>
                    {n.body && <p className="mt-1 text-sm text-muted">{n.body}</p>}
                    <p className="mt-1.5 text-xs text-muted">{formatDateTime(n.createdAt)}</p>
                  </div>
                  {!n.readAt && (
                    <form action={markNotificationReadAction.bind(null, n.id)}>
                      <button type="submit" className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent-ink hover:bg-surface-2">Oxundu</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/panel/bildirisler" />
        </>
      )}
    </div>
  );
}
