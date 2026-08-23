import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type TextareaProps = {
  label: string;
  id: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className"> & {
    className?: string;
  };

export function Textarea({ label, id, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        className={cn(
          "min-h-40 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent",
          className,
        )}
        {...props}
      />
    </div>
  );
}
