import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "public", "demo");

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Neutral, professional placeholder portrait. Replace via Admin → Müəllimlər → Şəkil. */
export function teacherPortraitSvg(name: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" role="img" aria-label="${name}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#101C38"/><stop offset="1" stop-color="#1B2F57"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E3C77E"/><stop offset="1" stop-color="#B58A2C"/></linearGradient>
</defs>
<rect width="400" height="500" fill="url(#bg)"/>
<circle cx="200" cy="210" r="150" fill="none" stroke="url(#gold)" stroke-opacity=".35" stroke-width="2"/>
<circle cx="200" cy="190" r="66" fill="#CFD8EA"/>
<path d="M70 500c0-96 58-162 130-162s130 66 130 162z" fill="#B8C4DD"/>
<text x="200" y="455" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="46" fill="url(#gold)" letter-spacing="4">${initials(name)}</text>
</svg>`;
}

export function courseThumbSvg(accent: string, variant: number): string {
  const rings = Array.from({ length: 5 }, (_, i) => `<circle cx="${470 + variant * 12}" cy="${90 + variant * 8}" r="${50 + i * 38}" fill="none" stroke="${accent}" stroke-opacity="${0.5 - i * 0.08}" stroke-width="1.5"/>`).join("");
  const dots = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 10 }, (_, c) => `<circle cx="${40 + c * 22}" cy="${230 + r * 20}" r="2" fill="#fff" fill-opacity=".22"/>`).join(""),
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-hidden="true">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0C1730"/><stop offset="1" stop-color="#1A2D54"/></linearGradient></defs>
<rect width="640" height="360" fill="url(#g)"/>${rings}${dots}
<rect x="40" y="40" width="64" height="4" rx="2" fill="${accent}"/>
</svg>`;
}

export function writePlaceholders(teachers: { slug: string; name: string }[], subjects: { slug: string; accent: string }[]) {
  mkdirSync(path.join(root, "teachers"), { recursive: true });
  mkdirSync(path.join(root, "courses"), { recursive: true });
  for (const t of teachers) writeFileSync(path.join(root, "teachers", `${t.slug}.svg`), teacherPortraitSvg(t.name));
  subjects.forEach((s, i) => writeFileSync(path.join(root, "courses", `${s.slug}.svg`), courseThumbSvg(s.accent, i)));
}
