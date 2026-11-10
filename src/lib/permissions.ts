export type Role = "student" | "teacher" | "admin";

/** Granular capabilities an admin can grant (primarily to teachers). Admins implicitly have all of them. */
export const PERMISSIONS = {
  "lessons.manage": "Öz dərslərini yaratmaq və redaktə etmək",
  "questions.manage": "Sual bankını idarə etmək",
  "exams.manage": "İmtahan yaratmaq və dərc etmək",
  "exams.assign": "İmtahanları sinif/qruplara təyin etmək",
  "announcements.publish": "Elanlar dərc etmək",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export interface Actor {
  id: string;
  role: Role;
  permissions: ReadonlySet<string>;
}

export function can(actor: Pick<Actor, "role" | "permissions"> | null | undefined, permission: Permission): boolean {
  if (!actor) return false;
  if (actor.role === "admin") return true;
  return actor.role === "teacher" && actor.permissions.has(permission);
}

export function isStaff(role: Role | undefined | null): boolean {
  return role === "teacher" || role === "admin";
}
