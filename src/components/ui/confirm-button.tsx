"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { Button, type ButtonVariant } from "./button";

/**
 * Button that asks for confirmation in an accessible native <dialog> before running a server action.
 * `action` receives no arguments; bind ids on the server with `.bind(null, id)`.
 */
export function ConfirmButton({
  action,
  title,
  description,
  confirmLabel = "Təsdiq et",
  variant = "danger",
  size = "sm",
  children,
}: {
  action: () => Promise<{ ok?: boolean; error?: string; message?: string } | void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button variant={variant === "danger" ? "outline" : variant} size={size} onClick={() => ref.current?.showModal()} className={variant === "danger" ? "text-danger border-danger/40" : ""}>
        {children}
      </Button>
      <dialog ref={ref} className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-border bg-surface p-6 text-text shadow-hero backdrop:bg-navy-950/60">
        <h3 className="font-sans text-lg font-bold">{title}</h3>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
        {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => ref.current?.close()}>
            Ləğv et
          </Button>
          <Button
            variant={variant}
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await action();
                if (res && res.error) setError(res.error);
                else ref.current?.close();
              })
            }
          >
            {pending ? "Gözləyin…" : confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
