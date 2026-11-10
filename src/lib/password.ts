import argon2 from "argon2";

const OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/** A genuine hash we verify against when the account does not exist, so login timing stays uniform. */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(`dummy-${Math.random()}-${Date.now()}`);
  return dummyHash;
}

export function passwordProblems(password: string): string | null {
  if (password.length < 10) return "Şifrə ən azı 10 simvoldan ibarət olmalıdır.";
  if (password.length > 200) return "Şifrə çox uzundur.";
  if (!/[a-zA-ZəƏıİöÖüÜçÇşŞğĞ]/.test(password) || !/\d/.test(password))
    return "Şifrədə həm hərf, həm də rəqəm olmalıdır.";
  return null;
}
