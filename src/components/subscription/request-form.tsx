"use client";

import { requestSubscription } from "@/app/actions/subscriptions";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { PlanPicker, type PickerPlan } from "./plan-picker";

export function RequestForm({ plans, subjects, defaultPlanId }: { plans: PickerPlan[]; subjects: { id: string; name: string }[]; defaultPlanId?: string }) {
  return (
    <ActionForm action={requestSubscription} className="grid gap-5">
      <PlanPicker plans={plans} subjects={subjects} defaultPlanId={defaultPlanId} />
      <div>
        <SubmitButton>Sorğu göndər</SubmitButton>
      </div>
    </ActionForm>
  );
}
