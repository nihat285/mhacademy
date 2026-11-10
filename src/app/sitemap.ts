import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/queries/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const { teachers, subjects, lessons } = await getSitemapEntries();
  const fixed = ["", "/muellimler", "/fenler", "/dersler", "/sinaqlar", "/ixtisas-ballari", "/neticeler", "/haqqimizda", "/elaqe", "/qaydalar", "/mexfilik"];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}` })),
    ...subjects.map((s) => ({ url: `${base}/fenler/${s.slug}` })),
    ...teachers.map((t) => ({ url: `${base}/muellimler/${t.slug}`, lastModified: t.updatedAt })),
    ...lessons.map((l) => ({ url: `${base}/dersler/${l.slug}`, lastModified: l.updatedAt })),
  ];
}
