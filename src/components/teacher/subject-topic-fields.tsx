"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Field } from "@/components/ui/action-form";
import { cn } from "@/lib/cn";

const NEW_TOPIC = "__new";
const selectClass = "h-11 w-full rounded-xl border border-border-strong bg-surface px-3.5 text-[0.95rem] text-text transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

/**
 * React resets a form's fields to their initial values when its action finishes (e.g. after a validation error),
 * which would silently drop the chosen subject/topic. This renders nothing, and tells the pickers to remount
 * with the current choice as their initial value once a submission is done.
 */
function ResetGuard({ onSubmitted }: { onSubmitted: () => void }) {
  const { pending } = useFormStatus();
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending) onSubmitted();
    was.current = pending;
  }, [pending, onSubmitted]);
  return null;
}

/**
 * Subject + topic pickers. The topic list follows the chosen subject, and its last entry
 * ("Yeni mövzu yaz…") reveals a text box so the teacher can type a topic that is not in the list yet.
 * The server creates it (or reuses an existing one with the same name) when the lesson is saved.
 */
export function SubjectTopicFields({
  subjects,
  topics,
  defaultSubjectId,
  defaultTopicId,
}: {
  subjects: { id: string; name: string }[];
  topics: { id: string; subjectId: string; name: string }[];
  defaultSubjectId?: string;
  defaultTopicId?: string | null;
}) {
  const [subjectId, setSubjectId] = useState(defaultSubjectId ?? subjects[0]?.id ?? "");
  const [topic, setTopic] = useState(defaultTopicId ?? "");
  const [epoch, setEpoch] = useState(0);
  const options = topics.filter((t) => t.subjectId === subjectId);

  return (
    <>
      <ResetGuard onSubmitted={() => setEpoch((e) => e + 1)} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="f-subjectId" className="mb-1.5 block text-sm font-semibold">Fənn</label>
          <select
            key={`s-${epoch}`}
            id="f-subjectId"
            name="subjectId"
            defaultValue={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setTopic("");
            }}
            className={selectClass}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-topicId" className="mb-1.5 block text-sm font-semibold">Mövzu</label>
          <select key={`t-${subjectId}-${epoch}`} id="f-topicId" name="topicId" defaultValue={topic} onChange={(e) => setTopic(e.target.value)} className={selectClass}>
            <option value="">— Mövzu seçilməyib —</option>
            {options.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
            <option value={NEW_TOPIC}>➕ Yeni mövzu yaz…</option>
          </select>
        </div>
      </div>
      {topic === NEW_TOPIC && (
        <Field
          name="newTopic"
          label="Yeni mövzunun adı"
          maxLength={160}
          autoFocus
          placeholder="Məs.: Kvadrat tənliklər"
          hint="Bu mövzu seçilmiş fənnə əlavə olunacaq və növbəti dərslərdə siyahıdan seçə biləcəksiniz."
          className={cn("sm:max-w-xl")}
        />
      )}
    </>
  );
}
