import { PanelShell } from "@/components/panel/shell";
import { STUDENT_NAV } from "@/components/panel/nav-config";
import { requireRole } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["student"], "/panel");
  return <PanelShell user={user} items={STUDENT_NAV}>{children}</PanelShell>;
}
