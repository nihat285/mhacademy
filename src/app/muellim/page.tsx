import type { Metadata } from "next";
import { DashboardHome } from "@/components/panel/home";
import { requireRole } from "@/lib/auth";
import { getTeacherOverview } from "@/lib/queries/panel";

export const metadata: Metadata = { title: "Müəllim paneli" };

export default async function TeacherHome() {
  const user = await requireRole(["teacher", "admin"], "/muellim");
  const o = await getTeacherOverview(user.id);
  return (
    <DashboardHome
      user={user}
      stats={[
        { label: "Dərslərim", value: o.lessons },
        { label: "Suallarım", value: o.questions },
        { label: "Sınaqlarım", value: o.exams },
      ]}
      links={[
        { href: "/muellim/dersler/yeni", label: "Yeni dərs" },
        { href: "/muellim/suallar/yeni", label: "Yeni sual" },
        { href: "/muellim/sinaqlar/yeni", label: "Yeni sınaq" },
        { href: "/muellim/yazisma", label: "Yazışma" },
        { href: "/dersler", label: "Dərs kitabxanası (sayt)" },
        { href: "/sinaqlar", label: "Sınaqlar (sayt)" },
      ]}
    />
  );
}
