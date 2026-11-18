"use client";

import { SubmitButton } from "@/components/ui/action-form";
import { CField, CForm, CSelect, CTextArea } from "@/components/content/form-kit";
import { createLiveSessionAction, updateLiveSessionAction } from "@/app/actions/live";

export interface LiveFormValues {
  id?: string; classId?: string; title?: string; description?: string; startsAt?: string; durationMin?: number; joinUrl?: string; passcode?: string;
}

export function LiveForm({ area, classes, values = {} }: { area: "muellim" | "idare"; classes: { id: string; name: string; teacherName: string }[]; values?: LiveFormValues }) {
  const editing = !!values.id;
  return (
    <CForm action={editing ? updateLiveSessionAction : createLiveSessionAction} className="space-y-5">
      <input type="hidden" name="area" value={area} />
      {editing && <input type="hidden" name="id" value={values.id} />}
      {editing ? (
        <input type="hidden" name="classId" value={values.classId} />
      ) : (
        <CSelect
          name="classId" label="Sinif" defaultValue={values.classId}
          hint="Dərs yalnız bu sinfin şagirdlərinə görünəcək."
          options={[{ value: "", label: "Sinif seçin…" }, ...classes.map((c) => ({ value: c.id, label: area === "idare" ? `${c.name} — ${c.teacherName}` : c.name }))]}
        />
      )}
      <CField name="title" label="Başlıq" defaultValue={values.title} maxLength={160} placeholder="Məsələn: Kvadrat tənliklər — təkrar" />
      <div className="grid gap-5 sm:grid-cols-2">
        <CField name="startsAt" label="Başlama vaxtı (Bakı vaxtı)" type="datetime-local" defaultValue={values.startsAt} />
        <CField name="durationMin" label="Müddət (dəqiqə)" type="number" min={15} max={240} step={5} defaultValue={String(values.durationMin ?? 60)} />
      </div>
      <CField
        name="joinUrl" label="Görüş linki" type="url" defaultValue={values.joinUrl} placeholder="https://meet.google.com/abc-defg-hij"
        hint="Zoom, Google Meet, Teams və ya başqa https:// link. Şagirdlər linki yalnız dərsdən 10 dəqiqə əvvəl “Qoşul” düyməsi ilə görür."
      />
      <CField name="passcode" label="Parol (varsa)" defaultValue={values.passcode} maxLength={40} hint="Linkdə artıq daxil deyilsə, görüş parolu." />
      <CTextArea name="description" label="Təsvir (könüllü)" defaultValue={values.description} rows={3} maxLength={2000} hint="Mövzu, hazırlıq və s." />
      <SubmitButton pendingText="Saxlanılır…">{editing ? "Dəyişiklikləri saxla" : "Dərsi yarat"}</SubmitButton>
    </CForm>
  );
}
