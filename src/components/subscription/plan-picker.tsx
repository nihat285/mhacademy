"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface PickerPlan {
  id: string;
  name: string;
  priceAzn: number;
  /** null = all subjects */
  subjectLimit: number | null;
}

/** Plan radio buttons + subject checkboxes limited to what the chosen plan allows. Submits `planId` and `subjectIds`. */
export function PlanPicker({ plans, subjects, defaultPlanId }: { plans: PickerPlan[]; subjects: { id: string; name: string }[]; defaultPlanId?: string }) {
  const [planId, setPlanId] = useState(defaultPlanId ?? plans[0]?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const plan = plans.find((p) => p.id === planId);
  const limit = plan?.subjectLimit ?? null;

  const choosePlan = (id: string) => {
    setPlanId(id);
    const next = plans.find((p) => p.id === id)?.subjectLimit ?? null;
    setPicked((cur) => (next === null ? [] : cur.slice(0, next)));
  };
  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : limit !== null && cur.length >= limit ? cur : [...cur, id]));

  return (
    <div className="grid gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Paket</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {plans.map((p) => (
            <label key={p.id} className={cn("cursor-pointer rounded-xl border px-4 py-3 text-sm", planId === p.id ? "border-accent bg-accent/10" : "border-border-strong")}>
              <input type="radio" name="planId" value={p.id} checked={planId === p.id} onChange={() => choosePlan(p.id)} className="sr-only" />
              <span className="block font-semibold">{p.name}</span>
              <span className="block text-xs text-muted">
                {p.priceAzn} AZN / ay · {p.subjectLimit === null ? "bütün fənlər" : `${p.subjectLimit} fənn`}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {limit === null ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">Bu paket bütün fənləri əhatə edir, fənn seçmək lazım deyil.</p>
      ) : (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">
            Fənn seçin ({picked.length}/{limit})
          </legend>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => {
              const on = picked.includes(s.id);
              const blocked = !on && picked.length >= limit;
              return (
                <label key={s.id} className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold", on ? "border-accent bg-accent text-on-accent" : "border-border-strong", blocked ? "cursor-not-allowed opacity-45" : "cursor-pointer")}>
                  <input type="checkbox" name="subjectIds" value={s.id} checked={on} disabled={blocked} onChange={() => toggle(s.id)} className="sr-only" />
                  {s.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
