import type { ComponentProps, ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

/** Responsive table wrapper: scrolls horizontally on small screens. */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-border bg-surface shadow-card", className)}>
      <table className="w-full min-w-[40rem] text-left text-sm">{children}</table>
    </div>
  );
}
export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">{children}</thead>;
}
export function Th({ className, ...p }: ComponentProps<"th">) {
  return <th scope="col" className={cn("px-4 py-3 font-semibold", className)} {...p} />;
}
export function Td({ className, ...p }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...p} />;
}
export function Tr({ className, ...p }: ComponentProps<"tr">) {
  return <tr className={cn("border-b border-border last:border-0 hover:bg-surface-2/60", className)} {...p} />;
}

/** GET-based filter bar (works without JS, keeps URLs shareable). `children` are extra <select>/<input> controls. */
export function FilterBar({ action, q, placeholder = "Axtar…", children }: { action: string; q?: string; placeholder?: string; children?: ReactNode }) {
  return (
    <form action={action} role="search" className="mb-5 flex flex-wrap items-center gap-2">
      <label className="relative min-w-52 flex-1">
        <span className="sr-only">Axtarış</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder={placeholder} className="h-10 w-full rounded-xl border border-border-strong bg-surface pl-9 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
      </label>
      {children}
      <button type="submit" className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:opacity-90">Axtar</button>
    </form>
  );
}
export const selectClass = "h-10 rounded-xl border border-border-strong bg-surface px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
