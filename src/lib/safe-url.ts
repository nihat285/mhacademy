import { z } from "zod";

/** Only plain https URLs: no javascript:/data:/http:, no embedded credentials, host must look like a domain. */
export function isSafeHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && u.hostname.includes(".") && !/\s/.test(value);
  } catch {
    return false;
  }
}

/** Empty string is allowed (means "not set"). */
export const optionalHttpsUrl = z
  .string()
  .trim()
  .max(300, "Ünvan çox uzundur.")
  .refine((v) => v === "" || isSafeHttpsUrl(v), "Yalnız https:// ilə başlayan düzgün ünvan daxil edin.");
