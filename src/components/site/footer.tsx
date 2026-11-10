import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { Logo } from "@/components/ui/logo";
import { NAV_ITEMS } from "./nav-items";

type Contact = { email?: string; phone?: string; address?: string };
type Socials = Record<string, string>;

const SOCIAL_LABELS: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", telegram: "Telegram" };

export async function SiteFooter() {
  const rows = await db.select().from(siteSettings).where(inArray(siteSettings.key, ["contact", "socials"]));
  const contact = (rows.find((r) => r.key === "contact")?.value ?? {}) as Contact;
  const socials = (rows.find((r) => r.key === "socials")?.value ?? {}) as Socials;
  const activeSocials = Object.entries(socials).filter(([, url]) => /^https?:\/\//.test(url));
  return (
    <footer className="mt-10 bg-navy-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-sm text-sm text-white/70">
            Premium təhsil, akademik mükəmməllik, ölçülə bilən tələbə irəliləyişi və peşəkar müəllimlər.
          </p>
          {activeSocials.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {activeSocials.map(([k, url]) => (
                <li key={k}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10">
                    {SOCIAL_LABELS[k] ?? k}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <nav aria-label="Alt naviqasiya">
          <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-gold-400">Səhifələr</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-white/80">
            {NAV_ITEMS.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="hover:text-white">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-gold-400">Əlaqə</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="hover:text-white">
                  {contact.email}
                </a>
              </li>
            )}
            {contact.phone && <li>{contact.phone}</li>}
            {contact.address && <li>{contact.address}</li>}
            <li>
              <Link href="/elaqe" className="underline underline-offset-4 hover:text-white">
                Bizə yazın
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-5 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:px-8">
          <p>© {new Date().getFullYear()} MH Academy. Bütün hüquqlar qorunur.</p>
          <ul className="flex gap-5">
            <li>
              <Link href="/qaydalar" className="hover:text-white">
                İstifadə qaydaları
              </Link>
            </li>
            <li>
              <Link href="/mexfilik" className="hover:text-white">
                Məxfilik siyasəti
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
