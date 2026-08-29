"use client";

import { useCallback, useEffect, useState } from "react";
import { ApplicationCard } from "@/components/tracker/ApplicationCard";
import { Card } from "@/components/ui/Card";
import {
  deleteApplication,
  listApplications,
  patchApplication,
  toUserMessage,
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
  const [busyKind, setBusyKind] = useState<"status" | "delete" | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listApplications();
      setApplications(rows);
    } catch (err) {
      setError(
        toUserMessage(err, "Couldn't load your applications. Please try again."),
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
    setBusyKind("status");
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
        toUserMessage(err, "Couldn't update this application. Please try again."),
      );
    } finally {
      setBusyId(null);
      setBusyKind(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Remove this application from your tracker?",
    );
    if (!confirmed) return;

    setBusyId(id);
    setBusyKind("delete");
    setError(null);
    try {
      await deleteApplication(id);
      setApplications((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        toUserMessage(err, "Couldn't delete this application. Please try again."),
      );
    } finally {
      setBusyId(null);
      setBusyKind(null);
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
      {applications.length === 0 && !error ? (
        <Card>
          <h2 className="font-serif text-xl text-navy">No applications yet</h2>
          <p className="mt-2 max-w-prose text-sm text-ink-muted">
            Your tracker is empty — that&apos;s normal for a new account. Analyze
            a job description on the dashboard, then choose{" "}
            <span className="text-ink">Track this application</span>.
          </p>
        </Card>
      ) : applications.length > 0 ? (
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
                      busyKind={busyId === item.id ? busyKind : null}
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
      ) : null}
    </div>
  );
}
