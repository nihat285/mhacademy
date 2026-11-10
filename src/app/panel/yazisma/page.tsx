import type { Metadata } from "next";
import { ChatPage } from "@/components/chat/chat-page";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Yazışma" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requireRole(["student"], "/panel/yazisma");
  return <ChatPage user={user} searchParams={await searchParams} />;
}
