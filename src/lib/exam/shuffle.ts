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

/**
 * Shuffles questions while keeping questions that share a passage together (and in their original order).
 * Each passage group and each ungrouped question is one unit; the units are shuffled.
 * `groupOf` returns the passage id of a question, or null/undefined when it has none.
 */
export function shuffleGrouped<T extends string>(
  ids: readonly T[],
  groupOf: (id: T) => string | null | undefined,
  rand?: (maxExclusive: number) => number,
): T[] {
  return shuffle(unitsOf(ids, groupOf), rand).flat();
}

function unitsOf<T extends string>(ids: readonly T[], groupOf: (id: T) => string | null | undefined): T[][] {
  const units: T[][] = [];
  const byGroup = new Map<string, T[]>();
  for (const id of ids) {
    const g = groupOf(id);
    if (!g) { units.push([id]); continue; }
    let unit = byGroup.get(g);
    if (!unit) { unit = []; byGroup.set(g, unit); units.push(unit); }
    unit.push(id);
  }
  return units;
}

/** Makes questions of the same passage contiguous without shuffling (unit order = first appearance). */
export function groupContiguous<T extends string>(ids: readonly T[], groupOf: (id: T) => string | null | undefined): T[] {
  return unitsOf(ids, groupOf).flat();
}
