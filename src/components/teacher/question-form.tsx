"use client";

import { useState } from "react";
import { ActionForm, Field, SelectField, SubmitButton, TextArea, type ActionState } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";

type QType = "mcq" | "true_false" | "numeric";

export interface QuestionDefaults {
  subjectId?: string;
  topicId?: string | null;
  type?: QType;
  difficulty?: string;
  text?: string;
  imageUrl?: string | null;
  explanation?: string | null;
  concept?: string | null;
  steps?: string[] | null;
  points?: string;
  numericAnswer?: string | null;
  numericTolerance?: string | null;
  options?: { text: string; isCorrect: boolean; whyWrong: string | null }[];
}

const TYPE_LABEL: Record<QType, string> = { mcq: "Çoxvariantlı", true_false: "Doğru / Yanlış", numeric: "Ədədi cavab" };
const num = (v?: string | null) => (v == null ? "" : String(Number(v)));

export function QuestionForm({
  action,
  subjects,
  topics,
  defaults = {},
  editing = false,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  subjects: { value: string; label: string }[];
  topics: { value: string; label: string }[];
  defaults?: QuestionDefaults;
  editing?: boolean;
  submitLabel: string;
}) {
  const [type, setType] = useState<QType>(defaults.type ?? "mcq");
  const opts = defaults.options ?? [];
  const correctIdx = Math.max(0, opts.findIndex((o) => o.isCorrect));
  const tfCorrect = opts.find((o) => o.isCorrect)?.text === "Yanlış" ? "false" : "true";

  return (
    <Card className="p-5 sm:p-7">
      <ActionForm action={action} className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField name="subjectId" label="Fənn" defaultValue={defaults.subjectId} options={subjects} />
          <SelectField name="topicId" label="Mövzu" defaultValue={defaults.topicId ?? ""} options={topics} />
          <SelectField
            name="type"
            label="Sual tipi"
            defaultValue={defaults.type ?? "mcq"}
            disabled={editing}
            onChange={(e) => setType(e.target.value as QType)}
            hint={editing ? "Tip yaradıldıqdan sonra dəyişdirilmir." : undefined}
            options={(Object.keys(TYPE_LABEL) as QType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
          />
          <SelectField
            name="difficulty"
            label="Çətinlik"
            defaultValue={defaults.difficulty ?? "medium"}
            options={[
              { value: "easy", label: "Asan" },
              { value: "medium", label: "Orta" },
              { value: "hard", label: "Çətin" },
            ]}
          />
        </div>

        {/* a disabled select is not submitted; the server uses the stored type when editing */}
        <TextArea name="text" label="Sual mətni" defaultValue={defaults.text} required className="[&_textarea]:min-h-32" />

        {type === "mcq" && (
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-semibold">Variantlar (düzgün olanı seçin)</legend>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="radio" name="correct" value={i} defaultChecked={i === correctIdx} className="h-4 w-4 accent-[var(--gold-500)]" />
                  {String.fromCharCode(65 + i)}
                </label>
                <Field name={`opt${i}`} label="Variant" defaultValue={opts[i]?.text} className="[&_label]:sr-only" placeholder={i < 2 ? "Məcburi" : "İstəyə bağlı"} />
                <Field name={`why${i}`} label="Niyə səhvdir" defaultValue={opts[i]?.whyWrong ?? ""} className="[&_label]:sr-only" placeholder="Niyə səhvdir (istəyə bağlı)" />
              </div>
            ))}
          </fieldset>
        )}

        {type === "true_false" && (
          <SelectField
            name="correctTf"
            label="Düzgün cavab"
            defaultValue={tfCorrect}
            options={[
              { value: "true", label: "Doğru" },
              { value: "false", label: "Yanlış" },
            ]}
          />
        )}

        {type === "numeric" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="numericAnswer" label="Düzgün ədəd" inputMode="decimal" defaultValue={num(defaults.numericAnswer)} />
            <Field name="numericTolerance" label="Dəqiqlik (±)" inputMode="decimal" defaultValue={num(defaults.numericTolerance)} hint="0 — dəqiq uyğunluq" />
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="points" label="Bal" inputMode="decimal" defaultValue={num(defaults.points) || "1"} />
          <Field name="concept" label="Əsas anlayış" defaultValue={defaults.concept ?? ""} hint="Səhv təhlilində şagirdə göstərilir." />
        </div>
        <TextArea name="explanation" label="Həll izahı" defaultValue={defaults.explanation ?? ""} />
        <TextArea name="steps" label="Addım-addım həll" defaultValue={(defaults.steps ?? []).join("\n")} hint="Hər sətir bir addımdır." className="[&_textarea]:min-h-24" />
        <Field name="imageUrl" label="Şəkil ünvanı" defaultValue={defaults.imageUrl ?? ""} />
        <div>
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}
