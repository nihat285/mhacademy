const MAP: Record<string, string> = { ə: "e", Ə: "e", ı: "i", İ: "i", ö: "o", Ö: "o", ü: "u", Ü: "u", ç: "c", Ç: "c", ş: "s", Ş: "s", ğ: "g", Ğ: "g" };

/** URL slug with Azerbaijani letters transliterated: "Leyla Quliyeva" -> "leyla-quliyeva". */
export function slugify(input: string, maxLength = 100): string {
  const base = input
    .replace(/[əƏıİöÖüÜçÇşŞğĞ]/g, (c) => MAP[c])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return base || "muellim";
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
