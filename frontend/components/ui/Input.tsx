import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = {
  label: string;
  id: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
    className?: string;
  };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, className, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        className={cn(
          "h-10 w-full max-w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent",
          className,
        )}
        {...props}
      />
    </div>
  );
});
