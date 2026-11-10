import { randomInt } from "node:crypto";
import { passwordProblems } from "./password";

// No look-alike characters (0/O, 1/l/I) so the password can be read out or typed from a screen.
const LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}

/**
 * Cryptographically random temporary password, e.g. "Kx7m-Pq4t-Wz9n".
 * 12 characters in three groups: 8 letters + 4 digits, shuffled. Always satisfies passwordProblems().
 */
export function generateTempPassword(): string {
  for (;;) {
    const chars = [...Array.from({ length: 8 }, () => pick(LETTERS)), ...Array.from({ length: 4 }, () => pick(DIGITS))];
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const out = `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8).join("")}`;
    if (passwordProblems(out) === null) return out;
  }
}
