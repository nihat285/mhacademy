import Link from "next/link";
import { buttonClasses } from "./button";

export const PAGE_SIZE = 20;

/** Server-rendered pagination preserving other query params. */
export function Pagination({ page, total, pageSize = PAGE_SIZE, basePath, params = {} }: { page: number; total: number; pageSize?: number; basePath: string; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    q.set("page", String(p));
    return `${basePath}?${q.toString()}`;
  };
  return (
    <nav aria-label="Səhifələmə" className="mt-6 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">
        Səhifə {page} / {pages} · cəmi {total}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={buttonClasses("outline", "sm")}>
            ← Əvvəlki
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className={buttonClasses("outline", "sm")}>
            Növbəti →
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
