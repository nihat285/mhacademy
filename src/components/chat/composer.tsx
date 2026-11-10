"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessage } from "@/app/actions/chat";
import type { ActionState } from "@/components/ui/action-form";
import { MAX_MESSAGE_LENGTH } from "@/lib/chat-rules";

export function Composer({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendMessage.bind(null, conversationId), {});
  const ref = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && ref.current) {
      ref.current.value = "";
      ref.current.focus();
    }
  }, [state]);
  return (
    <form ref={formRef} action={action} className="border-t border-border p-3">
      {state.error && <p role="alert" className="mb-2 text-xs font-medium text-danger">{state.error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          name="body"
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          required
          placeholder="Mesaj yazın… (Enter — göndər, Shift+Enter — yeni sətir)"
          aria-label="Mesaj"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="min-h-12 flex-1 resize-none rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <button type="submit" disabled={pending} className="h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand hover:opacity-90 disabled:opacity-50">
          {pending ? "…" : "Göndər"}
        </button>
      </div>
    </form>
  );
}
