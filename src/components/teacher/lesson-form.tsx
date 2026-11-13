import { ActionForm, CheckField, Field, SelectField, SubmitButton, TextArea, type ActionState } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { PendingMaterials } from "./pending-materials";
import { SubjectTopicFields } from "./subject-topic-fields";

export interface SubjectsTopics {
  subjects: { id: string; name: string }[];
  topics: { id: string; subjectId: string; name: string }[];
}

export const topicOptions = ({ subjects, topics }: SubjectsTopics) => [
  { value: "", label: "— Mövzu seçilməyib —" },
  ...topics.map((t) => ({ value: t.id, label: `${subjects.find((s) => s.id === t.subjectId)?.name ?? ""} — ${t.name}` })),
];

export interface LessonDefaults {
  title?: string;
  subjectId?: string;
  topicId?: string | null;
  provider?: string;
  videoRef?: string | null;
  durationSec?: number;
  description?: string | null;
  notes?: string | null;
  published?: boolean;
}

export function LessonForm({
  action,
  data,
  defaults = {},
  submitLabel,
  pendingMaterials,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  data: SubjectsTopics;
  defaults?: LessonDefaults;
  submitLabel: string;
  /** New-lesson form only: lets the teacher attach PDFs before the lesson exists. */
  pendingMaterials?: { enabled: boolean };
}) {
  return (
    <Card className="p-5 sm:p-7">
      <ActionForm action={action} className="grid gap-5">
        <Field name="title" label="Başlıq" defaultValue={defaults.title} required maxLength={220} />
        <SubjectTopicFields subjects={data.subjects} topics={data.topics} defaultSubjectId={defaults.subjectId} defaultTopicId={defaults.topicId} />
        <div className="grid gap-5 sm:grid-cols-3">
          <SelectField
            name="provider"
            label="Video mənbəyi"
            defaultValue={defaults.provider ?? "youtube"}
            options={[
              { value: "youtube", label: "YouTube" },
              { value: "vimeo", label: "Vimeo" },
              { value: "mp4", label: "MP4 (https ünvan)" },
              { value: "embed", label: "Embed (YouTube/Vimeo embed ünvanı)" },
            ]}
          />
          <Field name="videoRef" label="Video ünvanı / ID" defaultValue={defaults.videoRef ?? ""} hint="YouTube linki və ya 11 simvollu ID" className="sm:col-span-2" />
        </div>
        <Field name="durationMin" label="Müddət (dəqiqə)" type="number" min={0} max={600} defaultValue={defaults.durationSec ? Math.round(defaults.durationSec / 60) : ""} className="sm:max-w-48" />
        <TextArea name="description" label="Qısa təsvir" defaultValue={defaults.description ?? ""} className="[&_textarea]:min-h-20" />
        <TextArea name="notes" label="Yazılı dərs qeydləri" defaultValue={defaults.notes ?? ""} hint="Video olmadan da dərc etmək olar." className="[&_textarea]:min-h-48" />
        {pendingMaterials && <PendingMaterials enabled={pendingMaterials.enabled} />}
        <CheckField name="published" label="Dərc olunsun" hint="Söndürülübsə dərs yalnız sizə görünür (qaralama)." defaultChecked={defaults.published ?? false} />
        <div>
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}
