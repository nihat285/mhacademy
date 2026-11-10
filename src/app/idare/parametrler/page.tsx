import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/shell";
import { Badge, Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { appUrl } from "@/lib/email";

export const metadata: Metadata = { title: "Parametrlər" };

/** Read-only deployment status: secrets are never displayed, only whether they are configured. */
export default async function SettingsPage() {
  await requireRole(["admin"], "/idare/parametrler");
  const prod = process.env.NODE_ENV === "production";
  const smtp = !!process.env.SMTP_HOST;
  const rows: { label: string; value: string; ok: boolean; hint?: string }[] = [
    { label: "Mühit", value: prod ? "Production" : "Development", ok: true },
    { label: "Sayt ünvanı (APP_URL)", value: appUrl(), ok: !prod || !appUrl().includes("localhost"), hint: "Production-da real domen olmalıdır (e-poçt linkləri üçün)." },
    { label: "E-poçt göndərişi (SMTP)", value: smtp ? "Qoşulub" : prod ? "Qoşulmayıb — şifrə sıfırlama işləməyəcək" : "Qoşulmayıb — məktublar .dev-mail qovluğuna yazılır", ok: smtp || !prod },
    { label: "Verilənlər bazası SSL", value: process.env.DATABASE_SSL === "true" ? "Aktiv" : "Qeyri-aktiv", ok: !prod || process.env.DATABASE_SSL === "true" },
  ];
  return (
    <>
      <PageHeader title="Parametrlər" intro="Quraşdırmanın vəziyyəti. Dəyərlər `.env` faylında və ya hosting panelində dəyişdirilir; gizli açarlar burada göstərilmir." />
      <Card className="max-w-3xl divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-semibold">{r.label}</p>
              {r.hint && <p className="text-xs text-muted">{r.hint}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted">{r.value}</span>
              <Badge tone={r.ok ? "success" : "warning"}>{r.ok ? "Yaxşı" : "Diqqət"}</Badge>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
