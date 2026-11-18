import { can, type Actor } from "@/lib/permissions";

type A = Pick<Actor, "id" | "role" | "permissions">;

export type Area = "idare" | "muellim";
export function parseArea(v: unknown): Area {
  return v === "idare" ? "idare" : "muellim";
}

/** Admins edit everything; teachers need "lessons.manage" AND must own the lesson. */
export function canEditLesson(user: A, lesson: { teacherId: string | null }): boolean {
  if (user.role === "admin") return true;
  return can(user, "lessons.manage") && lesson.teacherId !== null && lesson.teacherId === user.id;
}

/** Admins edit everything; teachers need "questions.manage" AND must be the author. */
export function canEditQuestion(user: A, question: { authorId: string | null }): boolean {
  if (user.role === "admin") return true;
  return can(user, "questions.manage") && question.authorId !== null && question.authorId === user.id;
}
