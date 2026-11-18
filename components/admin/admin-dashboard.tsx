"use client";

import type {
  AdminStudent,
  ProjectManagementItem,
  ProjectStatus,
} from "@/lib/types";
import { isRecord, readError } from "@/lib/parse";
import { ExternalLink, RotateCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

function isProject(value: unknown): value is ProjectManagementItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    (value.kind === "link" || value.kind === "files") &&
    (value.url === null || typeof value.url === "string") &&
    (value.coverImage === null || typeof value.coverImage === "string") &&
    typeof value.authorName === "string" &&
    (value.status === "pending" ||
      value.status === "approved" ||
      value.status === "rejected") &&
    (value.reviewReason === null || typeof value.reviewReason === "string") &&
    typeof value.createdAt === "string"
  );
}

function isStudent(value: unknown): value is AdminStudent {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.createdAt === "string"
  );
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function AdminDashboard(): ReactNode {
  const [projects, setProjects] = useState<ProjectManagementItem[]>([]);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    async function loadDashboard(): Promise<void> {
      try {
        const [projectResponse, userResponse] = await Promise.all([
          fetch("/api/admin/projects", { cache: "no-store" }),
          fetch("/api/admin/users", { cache: "no-store" }),
        ]);
        const [projectData, userData]: unknown[] = await Promise.all([
          projectResponse.json(),
          userResponse.json(),
        ]);
        if (!active) return;

        if (!projectResponse.ok) {
          setError(
            projectResponse.status === 401
              ? "Sign in to access admin controls."
              : readError(projectData, "Could not load projects for review.")
          );
          return;
        }
        if (!userResponse.ok) {
          setError(readError(userData, "Could not load student accounts."));
          return;
        }
        if (
          !isRecord(projectData) ||
          !Array.isArray(projectData.projects) ||
          !projectData.projects.every(isProject) ||
          !isRecord(userData) ||
          !Array.isArray(userData.users) ||
          !userData.users.every(isStudent)
        ) {
          setError("The admin dashboard returned an unexpected response.");
          return;
        }
        setProjects(projectData.projects);
        setStudents(userData.users);
      } catch {
        if (active) {
          setError(
            "Could not load the admin dashboard. Check your connection."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function reviewProject(
    project: ProjectManagementItem,
    status: "approved" | "rejected"
  ): Promise<void> {
    if (busyId) return;
    setBusyId(project.id);
    setError(null);
    const reason = reviewNotes[project.id]?.trim() ?? "";
    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(readError(data, "Could not update the project review."));
        return;
      }
      setProjects((current) =>
        current.map((item) =>
          item.id === project.id
            ? {
                ...item,
                status,
                reviewReason: status === "rejected" ? reason || null : null,
              }
            : item
        )
      );
    } catch {
      setError("Could not update the project review. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeProject(project: ProjectManagementItem): Promise<void> {
    if (busyId || !window.confirm(`Permanently delete "${project.title}"?`)) {
      return;
    }
    setBusyId(project.id);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(readError(data, "Could not delete the project."));
        return;
      }
      setProjects((current) =>
        current.filter((item) => item.id !== project.id)
      );
    } catch {
      setError("Could not delete the project. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeStudent(student: AdminStudent): Promise<void> {
    if (
      busyId ||
      !window.confirm(
        `Delete student account ${student.email} and all of their projects?`
      )
    ) {
      return;
    }
    setBusyId(student.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${student.id}`, {
        method: "DELETE",
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(readError(data, "Could not delete the student account."));
        return;
      }
      setStudents((current) =>
        current.filter((item) => item.id !== student.id)
      );
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch {
      setError("Could not delete the student account. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  function retry(): void {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  const pendingProjects = projects.filter(
    (project) => project.status === "pending"
  );

  return (
    <div className="mt-8 grid gap-12">
      {error ? (
        <div
          role="alert"
          className="border-foreground/10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
        >
          <div>
            <p className="text-sm">{error}</p>
            {error === "Sign in to access admin controls." ? (
              <Link
                href="/login"
                className="mt-2 inline-flex text-sm font-medium underline underline-offset-2"
              >
                Sign in
              </Link>
            ) : null}
          </div>
          {!error.includes("Admin access is required") &&
          error !== "Sign in to access admin controls." ? (
            <button
              type="button"
              onClick={retry}
              className="focus-ring hover:bg-foreground/5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
            >
              <RotateCw aria-hidden="true" className="h-4 w-4" />
              Retry
            </button>
          ) : null}
        </div>
      ) : loading ? (
        <p role="status" className="text-foreground/60 py-12 text-center">
          Loading admin dashboard…
        </p>
      ) : (
        <>
          <section aria-labelledby="pending-heading">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 id="pending-heading" className="text-2xl font-semibold">
                  Pending projects
                </h2>
                <p className="text-foreground/60 mt-1 text-sm">
                  {pendingProjects.length} awaiting review
                </p>
              </div>
            </div>
            {pendingProjects.length ? (
              <div className="grid gap-4">
                {pendingProjects.map((project) => (
                  <article
                    key={project.id}
                    className="border-foreground/10 bg-background grid gap-4 rounded-2xl border p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold">
                            {project.title}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[project.status]}`}
                          >
                            {project.status}
                          </span>
                        </div>
                        <p className="text-foreground/55 mt-1 text-xs">
                          By {project.authorName} ·{" "}
                          {formatDate(project.createdAt)}
                        </p>
                        <p className="text-foreground/65 mt-3 text-sm leading-relaxed">
                          {project.description}
                        </p>
                      </div>
                      {project.kind === "files" ? (
                        <Link
                          href={`/projects/${project.id}/preview`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring hover:bg-foreground/5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                        >
                          Preview
                          <ExternalLink
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </Link>
                      ) : project.url ? (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring hover:bg-foreground/5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                        >
                          Open project
                          <ExternalLink
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </a>
                      ) : null}
                    </div>
                    <label className="text-xs font-medium">
                      Optional note for the student
                      <textarea
                        maxLength={300}
                        rows={2}
                        value={reviewNotes[project.id] ?? ""}
                        onChange={(event) =>
                          setReviewNotes((current) => ({
                            ...current,
                            [project.id]: event.target.value,
                          }))
                        }
                        className="focus-ring border-foreground/10 bg-background mt-2 w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void reviewProject(project, "approved")}
                        disabled={busyId !== null}
                        className="focus-ring bg-foreground text-background rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void reviewProject(project, "rejected")}
                        disabled={busyId !== null}
                        className="focus-ring border-foreground/15 hover:bg-foreground/5 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeProject(project)}
                        disabled={busyId !== null}
                        className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-foreground/60 border-foreground/10 rounded-2xl border p-5 text-sm">
                No projects are waiting for approval.
              </p>
            )}
          </section>

          <section aria-labelledby="all-projects-heading">
            <h2
              id="all-projects-heading"
              className="mb-5 text-2xl font-semibold"
            >
              All projects
            </h2>
            {projects.length ? (
              <div className="grid gap-3">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    className="border-foreground/10 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-medium">{project.title}</h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[project.status]}`}
                        >
                          {project.status}
                        </span>
                      </div>
                      <p className="text-foreground/55 mt-1 text-xs">
                        By {project.authorName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeProject(project)}
                      disabled={busyId !== null}
                      className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-foreground/60 border-foreground/10 rounded-2xl border p-5 text-sm">
                No projects have been submitted yet.
              </p>
            )}
          </section>

          <section aria-labelledby="students-heading">
            <h2 id="students-heading" className="mb-5 text-2xl font-semibold">
              Student accounts
            </h2>
            {students.length ? (
              <div className="grid gap-3">
                {students.map((student) => (
                  <article
                    key={student.id}
                    className="border-foreground/10 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{student.name}</h3>
                      <p className="text-foreground/55 mt-1 text-sm">
                        {student.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeStudent(student)}
                      disabled={busyId !== null}
                      className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      {busyId === student.id ? "Deleting…" : "Delete student"}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-foreground/60 border-foreground/10 rounded-2xl border p-5 text-sm">
                No student accounts to manage.
              </p>
            )}
            <p className="text-foreground/50 mt-3 text-xs">
              Admin accounts are intentionally excluded from this list.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
