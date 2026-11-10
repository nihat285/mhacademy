"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markRead } from "@/app/actions/chat";

/** Marks the conversation read, keeps the view scrolled to the newest message and polls for new ones. */
export function ThreadEffects({ conversationId, lastId }: { conversationId: string; lastId: string | null }) {
  const router = useRouter();
  useEffect(() => {
    void markRead(conversationId);
    document.getElementById("chat-end")?.scrollIntoView({ block: "end" });
  }, [conversationId, lastId]);
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 8000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
