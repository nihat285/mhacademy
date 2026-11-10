"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS = { fontSize: 12, fill: "var(--text-muted)" };
const GRID = "var(--border)";
const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontSize: 13 };

export function ScoreTrendChart({ data }: { data: { label: string; score: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Zamanla nəticələrin dəyişməsi qrafiki">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} unit="%" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Nəticə"]} />
          <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: "var(--accent)", strokeWidth: 0 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SubjectBarChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Fənlər üzrə orta nəticə qrafiki">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
          <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} unit="%" />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => [`${v}%`, "Orta nəticə"]} />
          <Bar dataKey="value" fill="var(--accent)" radius={[8, 8, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AccuracyDonut({ correct, incorrect, unanswered }: { correct: number; incorrect: number; unanswered: number }) {
  const data = [
    { name: "Düzgün", value: correct, color: "var(--success)" },
    { name: "Səhv", value: incorrect, color: "var(--danger)" },
    { name: "Cavabsız", value: unanswered, color: "var(--border-strong)" },
  ];
  const total = correct + incorrect + unanswered;
  return (
    <div className="flex items-center gap-6">
      <div className="relative h-40 w-40 shrink-0" role="img" aria-label={`Düzgün ${correct}, səhv ${incorrect}, cavabsız ${unanswered}`}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={50} outerRadius={72} paddingAngle={total ? 2 : 0} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold tabular-nums">{total ? Math.round((correct / total) * 100) : 0}%</span>
          <span className="text-[11px] text-muted">dəqiqlik</span>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
            <span className="text-muted">{d.name}</span>
            <span className="font-bold tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeeklyActivityChart({ data }: { data: { day: string; count: number }[] }) {
  return (
    <div className="h-40 w-full" role="img" aria-label="Həftəlik çalışma aktivliyi">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
          <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => [v, "Fəaliyyət"]} />
          <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
