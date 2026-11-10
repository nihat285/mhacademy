import { PanelShell } from "@/components/panel/shell";
import { ADMIN_NAV } from "@/components/panel/nav-config";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin"], "/idare");
  return <PanelShell user={user} items={ADMIN_NAV}>{children}</PanelShell>;
}
