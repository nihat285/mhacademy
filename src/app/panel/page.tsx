import type { Metadata } from "next";
import { DashboardHome } from "@/components/panel/home";
import { requireRole } from "@/lib/auth";
import { getStudentOverview } from "@/lib/queries/panel";

export const metadata: Metadata = { title: "Şagird paneli" };

export default async function StudentHome() {
  const user = await requireRole(["student"], "/panel");
  const o = await getStudentOverview(user.id);
  return (
    <DashboardHome
      user={user}
      stats={[
        { label: "Tamamlanmış dərs", value: o.completedLessons },
        { label: "Yadda saxlanılan dərs", value: o.bookmarkedLessons },
        { label: "Tamamlanmış sınaq", value: o.finishedAttempts },
      ]}
      links={[
        { href: "/dersler", label: "Video dərslər" },
        { href: "/sinaqlar", label: "Sınaqlar" },
        { href: "/neticeler", label: "Ümumi nəticələr" },
        { href: "/fenler", label: "Fənlər" },
      ]}
      note="Sınaq cəhdləri, səhv təhlili və təkrar bölmələri növbəti mərhələdə əlavə olunacaq."
    />
  );
}
