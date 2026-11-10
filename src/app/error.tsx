"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-1 flex-col items-center justify-center px-5 text-center">
      <h1 className="text-2xl font-semibold">Xəta baş verdi</h1>
      <p className="mt-2 text-muted">Gözlənilməz problem yarandı. Yenidən cəhd edin, davam edərsə bizimlə əlaqə saxlayın.</p>
      {error.digest && <p className="mt-2 text-xs text-muted">Kod: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>Yenidən cəhd et</Button>
    </main>
  );
}
