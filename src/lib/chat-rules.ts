import type { Role } from "./permissions";

export const MAX_MESSAGE_LENGTH = 2000;

/**
 * Who may open a direct conversation with whom. Students never message each other directly
 * (they can talk inside a class chat that a teacher moderates). Staff can message anyone.
 */
export function canDirectMessage(a: { id: string; role: Role }, b: { id: string; role: Role }): boolean {
  if (a.id === b.id) return false;
  if (a.role === "student" && b.role === "student") return false;
  return true;
}

/** Stable ordering of a pair so (a,b) and (b,a) map to the same conversation row. */
export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export const chatBase = (role: Role) => (role === "student" ? "/panel/yazisma" : role === "teacher" ? "/muellim/yazisma" : "/idare/yazisma");

/**
 * True when the text contains something that looks like a phone number: 9+ digits, optionally with a
 * leading "+" and spaces, dashes, dots or parentheses between them (e.g. "050 123 45 67", "+994501234567").
 * Dates ("12.03.2026", 8 digits) and short numbers (scores, years) are not flagged.
 */
export function containsPhoneNumber(text: string): boolean {
  const runs = text.match(/\+?\d(?:[\s().-]{0,2}\d){8,}/g);
  return !!runs && runs.some((r) => r.replace(/\D/g, "").length >= 9);
}

export const PHONE_BLOCKED_MESSAGE = "Mesajda telefon nömrəsi paylaşmaq olmaz. Əlaqə platforma daxilində qalmalıdır.";
