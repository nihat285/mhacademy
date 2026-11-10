import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Sends through SMTP when SMTP_HOST is configured. Otherwise (local development only) the message is
 * written to `.dev-mail/` and printed to the server log so verification/reset links stay usable.
 * In production without SMTP settings, sending fails loudly instead of silently dropping mail.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (process.env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({ from: process.env.MAIL_FROM ?? "MH Academy <no-reply@mhacademy.az>", ...mail });
    return;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SMTP_HOST is not configured; cannot send email in production.");
  }
  const dir = path.join(process.cwd(), ".dev-mail");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${Date.now()}-${mail.to.replace(/[^a-z0-9@.]/gi, "_")}.json`);
  await writeFile(file, JSON.stringify({ ...mail, at: new Date().toISOString() }, null, 2));
  console.log(`\n[dev-mail] To: ${mail.to}\n[dev-mail] ${mail.subject}\n${mail.text}\n`);
}
