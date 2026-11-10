import { randomInt } from "node:crypto";

/** Fisher–Yates with a cryptographically secure RNG (so orders cannot be predicted or reproduced by a student). */
export function shuffle<T>(items: readonly T[], rand: (maxExclusive: number) => number = (n) => randomInt(n)): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
