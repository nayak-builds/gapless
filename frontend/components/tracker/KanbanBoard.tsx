"use client";

import { useCallback, useEffect, useState } from "react";
import { ApplicationCard } from "@/components/tracker/ApplicationCard";
import { Card } from "@/components/ui/Card";
import {
  ApiError,
  deleteApplication,
  listApplications,
  patchApplication,
  type Application,
  type ApplicationStatus,
} from "@/lib/api";

const COLUMNS: { status: ApplicationStatus; title: string }[] = [
  { status: "applied", title: "Applied" },
  { status: "interviewing", title: "Interviewing" },
  { status: "offer", title: "Offer" },
  { status: "rejected", title: "Rejected" },
];

export function KanbanBoard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listApplications();
      setApplications(rows);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load applications",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    const previous = applications;
    setBusyId(id);
    setError(null);
    setApplications((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    try {
      const updated = await patchApplication(id, status);
      setApplications((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
    } catch (err) {
      setApplications(previous);
      setError(
        err instanceof ApiError ? err.message : "Could not update application",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Remove this application from your tracker?",
    );
    if (!confirmed) return;

    const previous = applications;
    setBusyId(id);
    setError(null);
    setApplications((current) => current.filter((item) => item.id !== id));
    try {
      await deleteApplication(id);
    } catch (err) {
      setApplications(previous);
      setError(
        err instanceof ApiError ? err.message : "Could not delete application",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="text-ink-muted">Loading applications…</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const cards = applications.filter(
            (item) => item.status === column.status,
          );
          return (
            <section key={column.status} className="flex min-w-0 flex-col gap-4">
              <h2 className="font-serif text-xl text-navy">
                {column.title}
                <span className="ml-2 text-sm font-sans font-medium text-ink-muted">
                  {cards.length}
                </span>
              </h2>
              {cards.length === 0 ? (
                <p className="text-sm text-ink-muted">No applications here yet.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {cards.map((item) => (
                    <ApplicationCard
                      key={item.id}
                      application={item}
                      busy={busyId === item.id}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
