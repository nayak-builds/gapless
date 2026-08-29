import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-navy text-navy-fg hover:bg-navy-hover",
  secondary: "bg-surface text-ink border border-line hover:bg-accent-muted",
  ghost: "bg-transparent text-ink hover:bg-accent-muted",
  danger: "bg-danger text-navy-fg hover:opacity-90",
} as const;

export type ButtonVariant = keyof typeof variants;

type ButtonProps = {
  variant?: ButtonVariant;
  href?: string;
  children: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

const baseClass =
  "inline-flex h-10 max-w-full items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50";

export function Button({
  variant = "primary",
  href,
  children,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = cn(baseClass, variants[variant], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
