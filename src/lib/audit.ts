import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { clientIp } from "./request";

export async function audit(
  actorId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>,
) {
  let ip: string | null = null;
  try {
    ip = await clientIp();
  } catch {
    /* outside a request (seed/tests) */
  }
  await db.insert(auditLogs).values({ actorId, action, entity, entityId, meta, ip });
}
