import type { ReactNode } from "react";

export function FaqItem({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  return (
    <details className="border-b border-line py-3">
      <summary className="min-h-10 cursor-pointer list-inside font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <span className="min-w-0 break-words">{question}</span>
      </summary>
      <div className="mt-2 min-w-0 break-words pb-2 text-sm text-ink-muted">
        {children}
      </div>
    </details>
  );
}
