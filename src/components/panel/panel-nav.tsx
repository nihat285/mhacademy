"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { PANEL_ICONS, type PanelIconName } from "./icons";

export interface PanelNavItem {
  href: string;
  label: string;
  icon: PanelIconName;
  /** Match only the exact path (for section roots like /panel). */
  exact?: boolean;
  badge?: number;
}

export function PanelNav({ items, orientation }: { items: PanelNavItem[]; orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel naviqasiyası" className={cn(orientation === "vertical" ? "flex flex-col gap-1" : "flex gap-1 overflow-x-auto px-3 py-2")}>
      {items.map((it) => {
        const Icon = PANEL_ICONS[it.icon];
        const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition",
              active ? "bg-brand text-on-brand" : "text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            <Icon size={17} aria-hidden />
            <span className="whitespace-nowrap">{it.label}</span>
            {it.badge ? <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-bold text-on-accent">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
