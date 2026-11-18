"use client";

import { useState, useTransition } from "react";
import { Video } from "lucide-react";
import { joinLiveSessionAction } from "@/app/actions/live";
import { Button } from "@/components/ui/button";

/** Asks the server for the link right now; the link never sits in the page markup. */
export function JoinButton({ sessionId, started }: { sessionId: string; started: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [link, setLink] = useState<{ url: string; passcode: string | null } | null>(null);

  const join = () =>
    start(async () => {
      setError("");
      const r = await joinLiveSessionAction(sessionId);
      if (!r.ok) { setError(r.error); return; }
      setLink({ url: r.url, passcode: r.passcode });
      window.open(r.url, "_blank", "noopener,noreferrer"); // popup blockers may refuse; the visible link below is the fallback
    });

  return (
    <div className="space-y-2">
      {!link ? (
        <Button onClick={join} disabled={pending}><Video size={16} aria-hidden /> {pending ? "Açılır…" : started ? "Dərsə qoşul" : "Qoşul"}</Button>
      ) : (
        <div role="status" className="rounded-xl bg-success-bg px-4 py-3 text-sm">
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-bold text-success underline">Görüşə keç</a>
          {link.passcode && <p className="mt-1 text-text">Parol: <code className="rounded bg-surface px-1.5 py-0.5 font-mono font-bold">{link.passcode}</code></p>}
          <p className="mt-1 text-xs text-muted">Linki başqası ilə bölüşməyin: yalnız sizin sinfiniz üçündür.</p>
        </div>
      )}
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
