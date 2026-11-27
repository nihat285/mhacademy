import { describe, expect, it } from "vitest";
import { canDownload, escapeLike, formatSize, isBlobPdfUrl, sizeFromContentRange, validateMaterial } from "./rules";

const SUBJECT = "6f1c2c1e-3b1a-4c1e-8f1a-0a1b2c3d4e5f";
const base = { title: "Riyaziyyat düsturları", subjectId: SUBJECT, description: "", grade: "", access: "public", published: true, hasFile: true };

describe("validateMaterial", () => {
  it("accepts a minimal valid material", () => {
    const r = validateMaterial(base);
    expect(r.ok && r.data.grade).toBeNull();
  });
  it("requires title, subject, file and a valid access type", () => {
    for (const bad of [{ title: "ab" }, { subjectId: "x" }, { hasFile: false }, { access: "secret" }]) {
      expect(validateMaterial({ ...base, ...bad }).ok).toBe(false);
    }
  });
  it("grade must be 1–11 or empty", () => {
    expect(validateMaterial({ ...base, grade: "11" }).ok).toBe(true);
    for (const g of ["0", "12", "2.5", "x"]) expect(validateMaterial({ ...base, grade: g }).ok).toBe(false);
  });
});

describe("isBlobPdfUrl", () => {
  it("accepts only our Blob materials folder", () => {
    expect(isBlobPdfUrl("https://abc123.public.blob.vercel-storage.com/materials/notes-AbCd.pdf")).toBe(true);
    for (const bad of [
      "https://abc123.public.blob.vercel-storage.com/imports/a.pdf",
      "https://abc123.public.blob.vercel-storage.com/materials/a.exe",
      "https://evil.com/materials/a.pdf",
      "https://abc123.public.blob.vercel-storage.com.evil.com/materials/a.pdf",
      "http://abc123.public.blob.vercel-storage.com/materials/a.pdf",
      "javascript:alert(1)",
    ]) expect(isBlobPdfUrl(bad)).toBe(false);
  });
});

describe("helpers", () => {
  it("formatSize", () => {
    expect(formatSize(null)).toBe("");
    expect(formatSize(500)).toBe("1 KB");
    expect(formatSize(2048)).toBe("2 KB");
    expect(formatSize(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
  it("canDownload", () => {
    expect(canDownload("public", false)).toBe(true);
    expect(canDownload("members", false)).toBe(false);
    expect(canDownload("members", true)).toBe(true);
    expect(canDownload("weird", true)).toBe(false);
  });
  it("escapeLike and sizeFromContentRange", () => {
    expect(escapeLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
    expect(sizeFromContentRange("bytes 0-31/12345")).toBe(12345);
    expect(sizeFromContentRange(null)).toBeNull();
  });
});
