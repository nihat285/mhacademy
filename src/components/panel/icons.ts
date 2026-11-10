import {
  BarChart3, Bell, BookMarked, BookOpen, CalendarClock, ClipboardList, FileQuestion, GraduationCap, History, LayoutDashboard,
  Library, Megaphone, MessageSquare, Repeat, ScrollText, Settings, ShieldCheck, Users, UserCircle, Video, Home, Layers, Trophy,
} from "lucide-react";

export const PANEL_ICONS = {
  dashboard: LayoutDashboard, exams: ClipboardList, mistakes: FileQuestion, practice: Repeat, saved: BookMarked, history: History,
  bell: Bell, profile: UserCircle, lessons: Video, questions: Library, users: Users, teachers: GraduationCap, subjects: Layers,
  courses: BookOpen, results: BarChart3, announce: Megaphone, home: Home, settings: Settings, audit: ScrollText, shield: ShieldCheck,
  calendar: CalendarClock, messages: MessageSquare, trophy: Trophy,
} as const;
export type PanelIconName = keyof typeof PANEL_ICONS;
