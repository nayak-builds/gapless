"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  type Application,
  type ApplicationStatus,
} from "@/lib/api";

const STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

function displayCompany(value: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") {
    return "Unknown company";
  }
  return trimmed;
}

function displayRole(value: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") {
    return "Untitled role";
  }
  return trimmed;
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
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
};

export function ApplicationCard({
  application,
  busy,
  onStatusChange,
  onDelete,
}: ApplicationCardProps) {
  const selectId = `status-${application.id}`;

  return (
    <Card>
      <h3 className="break-words font-serif text-lg text-navy">
        {displayCompany(application.company)}
      </h3>
      <p className="mt-1 break-words text-sm text-ink">{displayRole(application.role_title)}</p>
      <p className="mt-2 text-sm text-ink-muted">
        Applied {formatAppliedAt(application.applied_at)}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <label htmlFor={selectId} className="text-sm font-medium text-ink">
          Status
        </label>
        <select
          id={selectId}
          className="h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          value={application.status}
          disabled={busy}
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
          variant="danger"
          type="button"
          className="w-full"
          disabled={busy}
          onClick={() => onDelete(application.id)}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}
