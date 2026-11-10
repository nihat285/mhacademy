import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "onDark";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-105 active:brightness-95 shadow-sm",
  secondary: "bg-brand text-on-brand hover:opacity-90",
  outline: "border border-border-strong bg-surface text-text hover:bg-surface-2",
  ghost: "text-text hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
  onDark: "border border-white/25 text-white hover:bg-white/10",
};
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-12 px-7 text-base",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

type BtnProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };
export function Button({ variant, size, className, type = "button", ...props }: BtnProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

type LinkBtnProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };
export function LinkButton({ variant, size, className, ...props }: LinkBtnProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
