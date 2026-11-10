/**
 * Pure decision logic for the "last active administrator" protection.
 * `activeAdminIds` is the list of ids of users with role=admin and status=active (read inside the
 * same transaction, with the rows locked, so two concurrent demotions cannot both succeed).
 */
export function wouldRemoveLastAdmin(activeAdminIds: readonly string[], targetId: string): boolean {
  return activeAdminIds.includes(targetId) && activeAdminIds.length <= 1;
}

export type RoleChange = { from: "student" | "teacher" | "admin"; to: "student" | "teacher" | "admin" };

/** True when the change takes an account out of the active-admin pool (demotion, suspension or deletion). */
export function removesAdminPrivileges(current: { role: string; status: string }, change: { role?: string; status?: string; deleted?: boolean }): boolean {
  if (current.role !== "admin" || current.status !== "active") return false;
  if (change.deleted) return true;
  if (change.role !== undefined && change.role !== "admin") return true;
  if (change.status !== undefined && change.status !== "active") return true;
  return false;
}

export const LAST_ADMIN_MESSAGE = "Sonuncu aktiv administratorun rolunu dəyişmək, hesabını dayandırmaq və ya silmək olmaz.";
