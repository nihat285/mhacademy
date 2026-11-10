import Link from "next/link";
import { MessageSquarePlus, Users } from "lucide-react";
import { deleteChatMessage, startDirect } from "@/app/actions/chat";
import { ActionButton } from "@/components/admin/action-button";
import { Composer } from "@/components/chat/composer";
import { ThreadEffects } from "@/components/chat/thread-effects";
import { PageHeader } from "@/components/panel/shell";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { chatBase } from "@/lib/chat-rules";
import { cn } from "@/lib/cn";
import { formatDateTime, ROLE_LABEL } from "@/lib/format";
import { canModerate, getAccessibleConversation, getThread, listContacts, listConversations } from "@/lib/queries/chat";
import type { CurrentUser } from "@/lib/session";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 80);

export async function ChatPage({ user, searchParams }: { user: CurrentUser; searchParams: SP }) {
  const base = chatBase(user.role);
  const cid = first(searchParams.c);
  const picking = first(searchParams.yeni) !== undefined;
  const q = first(searchParams.q) ?? "";
  const [list, conv] = await Promise.all([listConversations(user), cid && /^[0-9a-f-]{36}$/i.test(cid) ? getAccessibleConversation(user, cid) : Promise.resolve(null)]);
  const thread = conv ? await getThread(user, conv) : [];
  const active = list.find((c) => c.id === conv?.id);
  const contacts = picking ? await listContacts(user, q || undefined) : [];
  const showRight = !!conv || picking;

  return (
    <>
      <PageHeader title="Yazışma" intro="Platforma daxilində yazışın — telefon nömrəsi və ya başqa tətbiq lazım deyil." />
      <div className="grid gap-4 md:grid-cols-[19rem_1fr]">
        <Card className={cn("overflow-hidden", showRight && "hidden md:block")}>
          <div className="border-b border-border p-3">
            <Link href={`${base}?yeni`} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-on-brand hover:opacity-90">
              <MessageSquarePlus size={16} /> Yeni yazışma
            </Link>
          </div>
          {list.length === 0 ? (
            <p className="p-5 text-sm text-muted">Hələ yazışma yoxdur.</p>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">
              {list.map((c) => (
                <li key={c.id}>
                  <Link href={`${base}?c=${c.id}`} className={cn("block px-4 py-3 hover:bg-surface-2", conv?.id === c.id && "bg-surface-2")}>
                    <div className="flex items-center gap-2">
                      {c.kind === "class" && <Users size={14} className="shrink-0 text-accent-ink" />}
                      <span className="truncate text-sm font-semibold">{c.title}</span>
                      {c.unread > 0 && <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">{c.unread}</span>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">{c.lastBody ?? "Mesaj yoxdur"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className={cn("flex min-h-[28rem] flex-col overflow-hidden", !showRight && "hidden md:flex")}>
          {conv && active ? (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Link href={base} className="text-sm text-muted hover:text-text md:hidden">← Geri</Link>
                <div>
                  <p className="font-semibold">{active.title}</p>
                  <p className="text-xs text-muted">{conv.kind === "class" ? "Sinif çatı · müəllim moderasiya edir" : active.subtitle ? ROLE_LABEL[active.subtitle] : ""}</p>
                </div>
              </div>
              <div className="max-h-[26rem] min-h-64 flex-1 space-y-3 overflow-y-auto p-4">
                {thread.length === 0 && <p className="text-center text-sm text-muted">Yazışmanı başladın.</p>}
                {thread.map((m) => (
                  <div key={m.id} className={cn("flex flex-col", m.mine ? "items-end" : "items-start")}>
                    {(conv.kind === "class" || !m.mine) && conv.kind === "class" && (
                      <span className="mb-0.5 text-xs text-muted">
                        {m.sender ?? "Silinmiş istifadəçi"} {m.role && m.role !== "student" && <Badge tone="gold" className="ml-1">{ROLE_LABEL[m.role]}</Badge>}
                      </span>
                    )}
                    <div className={cn("max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm", m.deletedAt ? "border border-dashed border-border italic text-muted" : m.mine ? "bg-accent text-on-accent" : "bg-surface-2")}>
                      {m.deletedAt ? "Mesaj silindi" : m.body}
                    </div>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                      {formatDateTime(m.createdAt)}
                      {!m.deletedAt && (m.mine || canModerate(user, conv)) && (
                        <ActionButton action={deleteChatMessage.bind(null, m.id)}>Sil</ActionButton>
                      )}
                    </span>
                  </div>
                ))}
                <div id="chat-end" />
              </div>
              <Composer conversationId={conv.id} />
              <ThreadEffects conversationId={conv.id} lastId={thread.at(-1)?.id ?? null} />
            </>
          ) : picking ? (
            <div className="p-4">
              <div className="mb-3 flex items-center gap-3">
                <Link href={base} className="text-sm text-muted hover:text-text md:hidden">← Geri</Link>
                <p className="font-semibold">Kimlə yazışmaq istəyirsiniz?</p>
              </div>
              <form action={base} className="mb-3 flex gap-2">
                <input type="hidden" name="yeni" value="" />
                <input name="q" defaultValue={q} placeholder="Ad axtar…" className="h-10 flex-1 rounded-xl border border-border-strong bg-surface px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
                <button type="submit" className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:opacity-90">Axtar</button>
              </form>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted">{user.role === "student" ? "Yazışa biləcəyiniz müəllim tapılmadı." : "Heç kim tapılmadı."}</p>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {contacts.map((p) => (
                    <li key={p.id}>
                      <form action={startDirect.bind(null, p.id)}>
                        <button type="submit" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-surface-2">
                          <span className="font-semibold">{p.name}</span>
                          <Badge>{ROLE_LABEL[p.role]}</Badge>
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              {user.role === "student" && <p className="mt-3 text-xs text-muted">Şagirdlər bir-birinə birbaşa yaza bilmir; sinif çatında birgə yazışmaq olur.</p>}
            </div>
          ) : (
            <EmptyState title="Yazışma seçin">Soldan yazışmanı seçin və ya “Yeni yazışma” düyməsinə basın.</EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
