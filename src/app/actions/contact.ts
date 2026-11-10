"use server";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import type { ActionState } from "@/components/ui/action-form";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { contactSchema, fieldErrors, formValues } from "@/lib/validation";

export async function submitContactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  // Honeypot: real users never see or fill this field. Pretend success so bots learn nothing.
  if (typeof fd.get("website") === "string" && (fd.get("website") as string).trim() !== "") {
    return { ok: true, message: "Mesajınız göndərildi. Tezliklə sizinlə əlaqə saxlayacağıq." };
  }
  const parsed = contactSchema.safeParse({ name: fd.get("name"), email: fd.get("email"), message: fd.get("message") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const ip = await clientIp();
  const limit = await rateLimit(`contact:${ip}`, 5, 3600);
  if (!limit.ok) return { error: "Çox sayda mesaj göndərildi. Bir az sonra yenidən cəhd edin.", values };

  await db.insert(contactMessages).values(parsed.data);
  return { ok: true, message: "Mesajınız göndərildi. Tezliklə sizinlə əlaqə saxlayacağıq." };
}
