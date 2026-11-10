import Link from "next/link";
import { cn } from "@/lib/cn";

const M = "538,335 697,474 698,531 585,433 584,640 538,640";
const STUB = "768,507 723,547 723,640 768,640";
const H = "986,318 941,357 941,481 850,481 850,437 803,476 803,640 849,640 850,527 941,527 941,640 986,640";
const STRIPE = "697,474 986,226 986,280 698,531";

/**
 * MH Academy mark: white (ink) "MH" with the gold rising stroke.
 * The ink colour follows the theme (`--logo-ink`), so it reads on navy and on light surfaces.
 */
export function LogoMark({ className, ink }: { className?: string; ink?: string }) {
  const fill = ink ?? "var(--logo-ink)";
  return (
    <svg viewBox="530 218 464 430" className={cn("h-10 w-auto shrink-0", className)} role="img" aria-label="MH Academy">
      <defs>
        <linearGradient id="mh-stripe" gradientUnits="userSpaceOnUse" x1="697" y1="500" x2="986" y2="240">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#ecd488" />
          <stop offset="0.75" stopColor="#d4af37" />
          <stop offset="1" stopColor="#c79e2c" />
        </linearGradient>
      </defs>
      <polygon points={M} fill={fill} />
      <polygon points={STUB} fill={fill} />
      <polygon points={H} fill={fill} />
      <polygon points={STRIPE} fill="url(#mh-stripe)" />
    </svg>
  );
}

/** Large, very faint mark used as a background watermark (decorative). */
export function MarkWatermark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="530 218 464 430" className={cn("pointer-events-none absolute text-white", className)} fill="currentColor">
      <polygon points={M} />
      <polygon points={STUB} />
      <polygon points={H} />
      <polygon points={STRIPE} />
    </svg>
  );
}

/** Brand signature element: the gold check derived from the logo's rising stroke. */
export function Signature({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 80" className={cn("pointer-events-none absolute text-gold-400", className)} fill="none">
      <path d="M4 48 L30 70 L96 8" stroke="currentColor" strokeWidth="13" strokeLinejoin="miter" strokeLinecap="butt" />
    </svg>
  );
}

export function Logo({ className, href = "/", inverted = false }: { className?: string; href?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)} aria-label="MH Academy — ana səhifə">
      <LogoMark ink={inverted ? "#ffffff" : undefined} className="h-9" />
      <span className="flex flex-col gap-1 leading-none whitespace-nowrap">
        <span className={cn("text-[0.95rem] font-extrabold tracking-[0.12em]", inverted ? "text-white" : "text-text")}>
          MH <span className={cn("font-light tracking-[0.3em]", inverted ? "text-gold-400" : "text-accent-ink")}>ACADEMY</span>
        </span>
      </span>
    </Link>
  );
}
