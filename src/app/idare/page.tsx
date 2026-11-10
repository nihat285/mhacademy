import type { Metadata } from "next";
import { DashboardHome } from "@/components/panel/home";
import { requireRole } from "@/lib/auth";
import { unreadTotal } from "@/lib/queries/chat";
import { getAdminOverview } from "@/lib/queries/panel";

export const metadata: Metadata = { title: "İdarə paneli" };

export default async function AdminHome() {
  const user = await requireRole(["admin"], "/idare");
  const [o, chatUnread] = await Promise.all([getAdminOverview(), unreadTotal(user)]);
  return (
    <DashboardHome
      user={user}
      stats={[
        { label: "Şagirdlər", value: o.students },
        { label: "Müəllimlər", value: o.teachers },
        { label: "Dərslər", value: o.lessons },
        { label: "Sınaqlar", value: o.exams },
        { label: "Cavablanmamış əlaqə mesajı", value: o.unreadMessages },
        { label: "Oxunmamış yazışma", value: chatUnread },
      ]}
      links={[
        { href: "/idare/yazisma", label: "Yazışma" },
        { href: "/idare/mesajlar", label: "Əlaqə mesajları" },
        { href: "/idare/sagirdler", label: "Şagirdlər" },
        { href: "/idare/muellimler", label: "Müəllimlər" },
        { href: "/idare/audit", label: "Audit jurnalı" },
        { href: "/muellimler", label: "Müəllim profilləri (sayt)" },
        { href: "/dersler", label: "Dərs kitabxanası (sayt)" },
        { href: "/sinaqlar", label: "Sınaqlar (sayt)" },
      ]}
    />
  );
}
