import type { ReactNode } from "react";

export function DashboardStep({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="font-serif text-lg text-navy md:text-xl">
        {step} · {title}
      </h2>
      {children}
    </div>
  );
}
