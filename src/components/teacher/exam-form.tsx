import { ActionForm, CheckField, Field, SelectField, SubmitButton, TextArea, type ActionState } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { DIFFICULTY_LABEL } from "@/lib/format";
import { topicOptions, type SubjectsTopics } from "./lesson-form";

export interface ExamDefaults {
  title?: string;
  description?: string | null;
  subjectId?: string;
  topicId?: string | null;
  grade?: number | null;
  difficulty?: string;
  visibility?: string;
  status?: string;
  startsAt?: Date;
  endsAt?: Date;
  durationMin?: number;
  passingPercent?: string;
  negativeMarking?: string;
  attemptLimit?: number;
  resultRelease?: string;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showExplanations?: boolean;
  questionIds?: string[];
  classIds?: string[];
}

/** Value for <input type="datetime-local"> in Asia/Baku wall-clock time (UTC+4). */
const local = (d?: Date) => (d ? new Date(d.getTime() + 4 * 3_600_000).toISOString().slice(0, 16) : "");
const n = (v?: string) => (v == null ? "" : String(Number(v)));

export function ExamForm({
  action,
  data,
  questions,
  classes,
  defaults = {},
  locked = false,
  canAssign,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  data: SubjectsTopics;
  questions: { id: string; text: string; subject: string; difficulty: keyof typeof DIFFICULTY_LABEL }[];
  classes: { id: string; name: string }[];
  defaults?: ExamDefaults;
  /** Questions cannot change once students have attempted the exam. */
  locked?: boolean;
  canAssign: boolean;
  submitLabel: string;
}) {
  const picked = new Set(defaults.questionIds ?? []);
  const pickedClasses = new Set(defaults.classIds ?? []);
  const bySubject = new Map<string, typeof questions>();
  for (const q of questions) bySubject.set(q.subject, [...(bySubject.get(q.subject) ?? []), q]);

  return (
    <Card className="p-5 sm:p-7">
      <ActionForm action={action} className="grid gap-6">
        <Field name="title" label="Başlıq" defaultValue={defaults.title} required maxLength={220} />
        <TextArea name="description" label="Təsvir" defaultValue={defaults.description ?? ""} className="[&_textarea]:min-h-20" />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField name="subjectId" label="Fənn" defaultValue={defaults.subjectId} options={data.subjects.map((s) => ({ value: s.id, label: s.name }))} />
          <SelectField name="topicId" label="Mövzu" defaultValue={defaults.topicId ?? ""} options={topicOptions(data)} />
          <Field name="grade" label="Sinif" type="number" min={1} max={11} defaultValue={defaults.grade ?? ""} />
          <SelectField name="difficulty" label="Çətinlik" defaultValue={defaults.difficulty ?? "medium"} options={Object.entries(DIFFICULTY_LABEL).map(([value, label]) => ({ value, label }))} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="startsAt" label="Başlama (Bakı vaxtı)" type="datetime-local" defaultValue={local(defaults.startsAt)} />
          <Field name="endsAt" label="Bitmə (Bakı vaxtı)" type="datetime-local" defaultValue={local(defaults.endsAt)} />
          <Field name="durationMin" label="Müddət (dəqiqə)" type="number" min={1} max={600} defaultValue={defaults.durationMin ?? 45} />
          <Field name="attemptLimit" label="Cəhd limiti" type="number" min={1} max={20} defaultValue={defaults.attemptLimit ?? 1} />
          <Field name="passingPercent" label="Keçid faizi" type="number" min={0} max={100} step="any" defaultValue={n(defaults.passingPercent) || "50"} />
          <Field name="negativeMarking" label="Yanlış cavab cəriməsi" type="number" min={0} max={1} step="any" defaultValue={n(defaults.negativeMarking) || "0"} hint="Sualın balının hissəsi: 0 — yoxdur, 0.25 — ¼" />
          <SelectField
            name="status"
            label="Status"
            defaultValue={defaults.status ?? "draft"}
            options={[
              { value: "draft", label: "Qaralama" },
              { value: "published", label: "Dərc olunub" },
              { value: "archived", label: "Arxiv" },
            ]}
          />
          <SelectField
            name="visibility"
            label="Görünürlük"
            defaultValue={defaults.visibility ?? "public"}
            options={[
              { value: "public", label: "Açıq (hamı)" },
              { value: "private", label: "Qapalı (yalnız mən)" },
              { value: "assigned", label: "Təyin olunmuş siniflər" },
            ]}
          />
          <SelectField
            name="resultRelease"
            label="Nəticələr nə vaxt açılır"
            defaultValue={defaults.resultRelease ?? "immediate"}
            options={[
              { value: "immediate", label: "Dərhal" },
              { value: "after_end", label: "Sınaq bitəndən sonra" },
              { value: "manual", label: "Əl ilə" },
            ]}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <CheckField name="shuffleQuestions" label="Sualları qarışdır" defaultChecked={defaults.shuffleQuestions ?? true} />
          <CheckField name="shuffleOptions" label="Variantları qarışdır" defaultChecked={defaults.shuffleOptions ?? true} />
          <CheckField name="showExplanations" label="İzahları göstər" defaultChecked={defaults.showExplanations ?? true} />
        </div>

        {canAssign && (
          <fieldset className="rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold">Siniflər (yalnız “Təyin olunmuş” görünürlükdə)</legend>
            {classes.length === 0 ? (
              <p className="text-sm text-muted">Hələ sinif yoxdur. Əvvəl “Siniflər” bölməsində sinif yaradın.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {classes.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-3 text-sm">
                    <input type="checkbox" name="classIds" value={c.id} defaultChecked={pickedClasses.has(c.id)} className="h-4 w-4 accent-[var(--gold-500)]" />
                    <span className="font-semibold">{c.name}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}

        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Suallar</legend>
          {locked && <p className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">Bu sınaqda artıq cəhdlər var — suallar dəyişdirilə bilməz.</p>}
          {questions.length === 0 ? (
            <p className="text-sm text-muted">Sual bankınız boşdur. Əvvəl “Sual bankı” bölməsində sual əlavə edin.</p>
          ) : (
            <div className="grid max-h-[28rem] gap-5 overflow-y-auto pr-1">
              {[...bySubject.entries()].map(([subject, qs]) => (
                <div key={subject}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{subject}</p>
                  <div className="grid gap-2">
                    {qs.map((q) => (
                      <label key={q.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm hover:bg-surface-2">
                        <input type="checkbox" name="questionIds" value={q.id} defaultChecked={picked.has(q.id)} disabled={locked} className="mt-1 h-4 w-4 accent-[var(--gold-500)]" />
                        <span className="line-clamp-2">
                          {q.text} <span className="text-xs text-muted">· {DIFFICULTY_LABEL[q.difficulty]}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <div>
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}
