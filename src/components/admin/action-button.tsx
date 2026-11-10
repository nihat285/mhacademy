"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";

/** One-click server action (no confirmation) for reversible toggles. Shows an error inline if it fails. */
export function ActionButton({ action, children, variant = "outline" }: { action: () => Promise<{ ok?: boolean; error?: string } | void>; children: ReactNode; variant?: ButtonVariant }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant={variant}
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await action();
            if (r && r.error) setError(r.error);
          })
        }
      >
        {pending ? "…" : children}
      </Button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  );
}
