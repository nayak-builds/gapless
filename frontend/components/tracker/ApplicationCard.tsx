"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { type Application, type ApplicationStatus } from "@/lib/api";

const STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

function isUnknown(value: string | null): boolean {
  const trimmed = value?.trim();
  return !trimmed || trimmed.toLowerCase() === "unknown";
}

function displayCompany(value: string | null): string {
  if (isUnknown(value)) {
    return "Company not listed";
  }
  return value!.trim();
}

function displayRole(value: string | null): string {
  if (isUnknown(value)) {
    return "Role not listed";
  }
  return value!.trim();
}

function formatAppliedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type ApplicationCardProps = {
  application: Application;
  busy: boolean;
  busyKind: "status" | "delete" | null;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
};

export function ApplicationCard({
  application,
  busy,
  busyKind,
  onStatusChange,
  onDelete,
}: ApplicationCardProps) {
  const selectId = `status-${application.id}`;
  const companyMissing = isUnknown(application.company);
  const title = companyMissing
    ? displayRole(application.role_title)
    : displayCompany(application.company);
  const subtitle = companyMissing
    ? displayCompany(application.company)
    : displayRole(application.role_title);

  return (
    <Card className="p-4 shadow-none">
      <h3 className="min-w-0 break-words font-serif text-lg text-navy">
        {title}
      </h3>
      <p
        className={
          companyMissing
            ? "mt-1 min-w-0 break-words text-sm text-ink-muted"
            : "mt-1 min-w-0 break-words text-sm text-ink"
        }
      >
        {subtitle}
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        Applied {formatAppliedAt(application.applied_at)}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {busy ? (
          <p className="text-sm text-ink-muted" role="status">
            {busyKind === "delete" ? "Deleting…" : "Updating…"}
          </p>
        ) : null}
        <label htmlFor={selectId} className="text-sm font-medium text-ink">
          Move to
        </label>
        <select
          id={selectId}
          className="h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          value={application.status}
          disabled={busy}
          aria-busy={busy && busyKind === "status"}
          onChange={(event) =>
            onStatusChange(application.id, event.target.value as ApplicationStatus)
          }
        >
          {STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          type="button"
          className="w-full !text-danger sm:w-auto"
          disabled={busy}
          aria-busy={busy && busyKind === "delete"}
          onClick={() => onDelete(application.id)}
        >
          {busy && busyKind === "delete" ? "Deleting…" : "Remove"}
        </Button>
      </div>
    </Card>
  );
}
