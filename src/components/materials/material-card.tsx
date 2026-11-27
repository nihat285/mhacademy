import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { ACCESS_LABEL, canDownload, formatSize } from "@/lib/materials/rules";

export interface CardMaterial {
  id: string; title: string; description: string | null; grade: number | null; access: string;
  sizeBytes: number | null; downloads: number; subjectName: string;
}

/**
 * The logo sits in a fixed square with padding and `object-contain`, so it can never touch or overflow the edge
 * of the card, whatever the image's proportions.
 */
export function MaterialCard({ m, signedIn }: { m: CardMaterial; signedIn: boolean }) {
  const ok = canDownload(m.access, signedIn);
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-3 bg-navy-900 p-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/apple-touch-icon.png" alt="" width={44} height={44} className="h-full w-full object-contain" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-gold-300">{m.subjectName}</p>
          <p className="mt-0.5 text-xs text-white/70">PDF{m.sizeBytes ? ` · ${formatSize(m.sizeBytes)}` : ""}{m.grade ? ` · ${m.grade}-ci sinif` : ""}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-sans text-base font-bold leading-snug [overflow-wrap:anywhere]">{m.title}</h3>
        {m.description && <p className="mt-1.5 line-clamp-3 text-sm text-muted [overflow-wrap:anywhere]">{m.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="min-w-0 truncate text-xs text-muted">
            {m.access === "members" && <Lock size={12} className="mr-1 inline" aria-hidden />}
            {ACCESS_LABEL[m.access as keyof typeof ACCESS_LABEL] ?? m.access}
            {m.downloads > 0 && ` · ${m.downloads} yükləmə`}
          </span>
          <Link
            href={`/materiallar/${m.id}/yukle`} prefetch={false}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent hover:brightness-105"
          >
            {ok ? <Download size={16} aria-hidden /> : <Lock size={16} aria-hidden />} {ok ? "Yüklə" : "Daxil ol"}
          </Link>
        </div>
      </div>
    </article>
  );
}
