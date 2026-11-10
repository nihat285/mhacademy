import { PanelShell } from "@/components/panel/shell";
import { TEACHER_NAV } from "@/components/panel/nav-config";
import { requireRole } from "@/lib/auth";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["teacher", "admin"], "/muellim");
  return <PanelShell user={user} items={TEACHER_NAV}>{children}</PanelShell>;
}
