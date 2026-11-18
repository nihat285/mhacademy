import { Badge } from "@/components/ui/card";
import { PROVIDER_LABEL, type LiveProvider, type Phase } from "@/lib/live/rules";

export function PhaseBadge({ phase, started }: { phase: Phase; started?: boolean }) {
  if (phase === "cancelled") return <Badge tone="danger">Ləğv edilib</Badge>;
  if (phase === "ended") return <Badge>Bitib</Badge>;
  if (phase === "joinable") return <Badge tone="success">{started ? "Davam edir" : "Tezliklə başlayır"}</Badge>;
  return <Badge tone="info">Gözlənilir</Badge>;
}

export const providerLabel = (p: LiveProvider) => PROVIDER_LABEL[p];
