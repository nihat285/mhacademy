import { Crown } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import type { VipAccess } from "@/lib/subscription";

/** Shown instead of a VIP video / PDF / exam when the viewer's package does not open it. */
export function VipLock({ access, next, what = "dərs" }: { access: Exclude<VipAccess, "open">; next: string; what?: string }) {
  const message =
    access === "anonymous"
      ? `Bu ${what} VIP üzvlər üçündür. Davam etmək üçün hesaba daxil olun və paket seçin.`
      : access === "other-subject"
        ? `Aktiv paketiniz bu fənni əhatə etmir. Paketinizi genişləndirin və ya fənn seçimini dəyişmək üçün bizimlə əlaqə saxlayın.`
        : `Bu ${what} VIP üzvlər üçündür. Paket seçərək bütün VIP dərslərə, PDF-lərə və sınaqlara çıxış əldə edin.`;
  return (
    <div className="flex flex-col items-center rounded-2xl border border-gold-500/40 bg-navy-900 px-6 py-12 text-center text-white">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/15 text-gold-400">
        <Crown size={28} />
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold">VIP məzmun</h2>
      <p className="mt-2 max-w-md text-white/75">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {access === "anonymous" && <LinkButton href={`/giris?next=${encodeURIComponent(next)}`} variant="outline">Daxil ol</LinkButton>}
        <LinkButton href="/paketler">Paketlərə bax</LinkButton>
      </div>
    </div>
  );
}
