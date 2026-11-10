"use client";

import { Badge, Card, CardHeader } from "@/components/ui/card";
import { AccuracyDonut, ScoreTrendChart, SubjectBarChart } from "@/components/charts";

// Illustrative values for the marketing preview ONLY. The real dashboard computes everything from saved attempts.
const TREND = [
  { label: "1", score: 48 },
  { label: "2", score: 55 },
  { label: "3", score: 61 },
  { label: "4", score: 58 },
  { label: "5", score: 72 },
  { label: "6", score: 78 },
];
const SUBJECTS = [
  { name: "Riyaz.", value: 78 },
  { name: "Fizika", value: 64 },
  { name: "Kimya", value: 71 },
  { name: "Az. dili", value: 83 },
];

export function DashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -top-3 right-4 z-10">
        <Badge tone="warning">Nümunə məlumatlarla önizləmə</Badge>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Nəticələrin dinamikası" subtitle="Hər sınaqdan sonra yeniləşir" />
          <div className="p-4">
            <ScoreTrendChart data={TREND} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Cavabların dəqiqliyi" />
          <div className="flex justify-center p-5">
            <AccuracyDonut correct={42} incorrect={13} unanswered={5} />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Fənlər üzrə orta nəticə" />
          <div className="p-4">
            <SubjectBarChart data={SUBJECTS} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Təkrar etməli mövzular" subtitle="Səhvlərinizə əsasən" />
          <ul className="space-y-3 p-5 text-sm">
            {["Modullu tənliklər", "Ədədi silsilə", "pH və mühit"].map((t) => (
              <li key={t} className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5">
                <span className="font-semibold">{t}</span>
                <span className="text-xs font-semibold text-accent-ink">Dərsə bax →</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
