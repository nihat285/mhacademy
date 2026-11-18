/**
 * Which staff panel a shared page is rendered under:
 * "muellim" (teacher, /muellim/...) or "idare" (administrator, /idare/...).
 */
export type Area = "muellim" | "idare";

export const AREAS: readonly Area[] = ["muellim", "idare"];

export function isArea(v: unknown): v is Area {
  return v === "muellim" || v === "idare";
}
