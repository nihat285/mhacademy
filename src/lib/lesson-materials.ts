import "server-only";

export const MAX_MATERIAL_BYTES = 10 * 1024 * 1024;
export const MAX_MATERIALS_PER_LESSON = 20;

/** Only files stored in our own Vercel Blob store, under materials/, may be registered (never arbitrary URLs). */
const BLOB_HOST = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i;

export function isOwnBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && BLOB_HOST.test(u.hostname) && u.pathname.startsWith("/materials/");
  } catch {
    return false;
  }
}

export interface MaterialInput {
  title: string;
  url: string;
  size: number;
}

/**
 * Reads the PDFs a teacher uploaded while still filling in the "new lesson" form
 * (hidden fields matTitle / matUrl / matSize, repeated once per file).
 * Invalid entries are rejected as a whole, so nothing half-attached is ever saved.
 */
export function parseMaterialInputs(fd: FormData): { items: MaterialInput[] } | { error: string } {
  const urls = fd.getAll("matUrl").map(String);
  const titles = fd.getAll("matTitle").map(String);
  const sizes = fd.getAll("matSize").map(Number);
  if (urls.length > MAX_MATERIALS_PER_LESSON) return { error: `Bir dərsə ən çox ${MAX_MATERIALS_PER_LESSON} material əlavə etmək olar.` };
  const items: MaterialInput[] = [];
  const seen = new Set<string>();
  for (const [i, url] of urls.entries()) {
    if (seen.has(url)) continue;
    seen.add(url);
    const size = sizes[i];
    if (!isOwnBlobUrl(url) || !Number.isInteger(size) || size <= 0 || size > MAX_MATERIAL_BYTES) return { error: "PDF materiallardan biri qəbul olunmur. Onu silib yenidən yükləyin." };
    items.push({ url, size, title: (titles[i] ?? "").trim().slice(0, 120) || "Material" });
  }
  return { items };
}
