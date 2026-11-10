"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

/** Generates a new temporary password and shows it once (it is stored only as a hash). */
export function ResetPassword({ action }: { action: () => Promise<{ ok?: boolean; error?: string; message?: string }> }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ ok?: boolean; error?: string; message?: string } | null>(null);
  return (
    <div>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Yeni müvəqqəti şifrə yaradılsın? Köhnə şifrə və açıq sessiyalar ləğv olunacaq.")) return;
          start(async () => setRes(await action()));
        }}
      >
        {pending ? "Gözləyin…" : "Şifrəni sıfırla"}
      </Button>
      {res?.error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{res.error}</p>}
      {res?.message && <p role="status" className="mt-3 rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success">{res.message}</p>}
    </div>
  );
}
