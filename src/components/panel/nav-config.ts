import type { PanelNavItem } from "./panel-nav";

export const STUDENT_NAV: PanelNavItem[] = [
  { href: "/panel", label: "İcmal", icon: "dashboard", exact: true },
  { href: "/panel/sinaqlar", label: "Sınaqlar", icon: "exams" },
  { href: "/panel/neticelerim", label: "Nəticələrim", icon: "history" },
  { href: "/panel/sehvlerim", label: "Səhvlərim", icon: "mistakes" },
  { href: "/panel/tekrar", label: "Təkrar", icon: "practice" },
  { href: "/panel/yadda-saxlananlar", label: "Yadda saxlanılanlar", icon: "saved" },
  { href: "/panel/yazisma", label: "Yazışma", icon: "messages" },
  { href: "/panel/bildirisler", label: "Bildirişlər", icon: "bell" },
  { href: "/panel/profil", label: "Profil", icon: "profile" },
];

export const TEACHER_NAV: PanelNavItem[] = [
  { href: "/muellim", label: "İcmal", icon: "dashboard", exact: true },
  { href: "/muellim/dersler", label: "Dərslər", icon: "lessons" },
  { href: "/muellim/suallar", label: "Sual bankı", icon: "questions" },
  { href: "/muellim/sinaqlar", label: "Sınaqlar", icon: "exams" },
   { href: "/muellim/neticeler", label: "Nəticələr", icon: "results" },
  { href: "/muellim/sinifler", label: "Siniflər", icon: "users" },
  { href: "/muellim/elanlar", label: "Elanlar", icon: "announce" },
  { href: "/muellim/yazisma", label: "Yazışma", icon: "messages" },
  { href: "/muellim/profil", label: "Profil", icon: "profile" },
];

export const ADMIN_NAV: PanelNavItem[] = [
  { href: "/idare", label: "İcmal", icon: "dashboard", exact: true },
  { href: "/idare/sagirdler", label: "Şagirdlər", icon: "users" },
  { href: "/idare/muellimler", label: "Müəllimlər", icon: "teachers" },
  { href: "/idare/fenler", label: "Fənlər və mövzular", icon: "subjects" },
  { href: "/idare/kurslar", label: "Kurslar", icon: "courses" },
  { href: "/idare/dersler", label: "Video dərslər", icon: "lessons" },
  { href: "/idare/suallar", label: "Sual bankı", icon: "questions" },
  { href: "/idare/sinaqlar", label: "Sınaqlar", icon: "exams" },
  { href: "/idare/neticeler", label: "Nəticələr", icon: "results" },
  { href: "/idare/elanlar", label: "Elanlar", icon: "announce" },
  { href: "/idare/sayt", label: "Sayt məzmunu", icon: "home" },
  { href: "/idare/yazisma", label: "Yazışma", icon: "messages" },
  { href: "/idare/mesajlar", label: "Əlaqə mesajları", icon: "messages" },
  { href: "/idare/parametrler", label: "Parametrlər", icon: "settings" },
  { href: "/idare/audit", label: "Audit jurnalı", icon: "audit" },
];
