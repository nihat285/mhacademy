import { db, type Tx } from "@/db";
import { notifications } from "@/db/schema";

export interface NewNotification {
  userId: string;
  type: "exam" | "result" | "lesson" | "announcement" | "reminder" | "system";
  title: string;
  body?: string;
  href?: string;
}

export async function notify(n: NewNotification | NewNotification[], tx: Tx | typeof db = db) {
  const rows = Array.isArray(n) ? n : [n];
  if (rows.length === 0) return;
  await tx.insert(notifications).values(rows);
}
