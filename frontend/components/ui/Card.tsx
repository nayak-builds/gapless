import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface p-6 shadow-card min-w-0 break-words",
        className,
      )}
    >
      {children}
    </div>
  );
}
