"use client";

import type {
  AdminStudent,
  ProjectManagementItem,
  ProjectStatus,
} from "@/lib/types";
import { isRecord, readError } from "@/lib/parse";
import {
  projectTechnologyNames,
  readProjectTechnologies,
} from "@/lib/project-technologies";
import { LoadingIndicator, Skeleton } from "@/components/ui/loading";
import { ExternalLink, RotateCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

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
    (value.authorFamily === null || typeof value.authorFamily === "string") &&
    (value.authorGrade === null || typeof value.authorGrade === "string") &&
    typeof value.language === "string" &&
    readProjectTechnologies(value.technologies) !== null &&
    (value.githubUrl === null || typeof value.githubUrl === "string") &&
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

type BusyAction =
  | "approve"
  | "reject"
  | "delete-pending-project"
  | "delete-project"
  | "delete-student";

type PendingDeletion =
  | {
      type: "project";
      project: ProjectManagementItem;
      location: "pending" | "all";
    }
  | { type: "student"; student: AdminStudent };

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
  const [busyAction, setBusyAction] = useState<{
    id: string;
    action: BusyAction;
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [pendingDeletion, setPendingDeletion] =
    useState<PendingDeletion | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const confirmationDialogRef = useRef<HTMLDialogElement>(null);
  const cancelDeleteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = confirmationDialogRef.current;
    if (!dialog) return;

    if (pendingDeletion && !dialog.open) {
      dialog.showModal();
      cancelDeleteButtonRef.current?.focus();
    } else if (!pendingDeletion && dialog.open) {
      dialog.close();
    }
  }, [pendingDeletion]);

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
    if (busyAction) return;
    setBusyAction({
      id: project.id,
      action: status === "approved" ? "approve" : "reject",
    });
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
      setBusyAction(null);
    }
  }

  async function removeProject(
    project: ProjectManagementItem,
    location: "pending" | "all"
  ): Promise<void> {
    if (busyAction) return;
    setBusyAction({
      id: project.id,
      action:
        location === "pending" ? "delete-pending-project" : "delete-project",
    });
    setDeleteError(null);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = readError(data, "Could not delete the project.");
        setError(message);
        setDeleteError(message);
        return;
      }
      setProjects((current) =>
        current.filter((item) => item.id !== project.id)
      );
      setPendingDeletion(null);
    } catch {
      const message = "Could not delete the project. Try again.";
      setError(message);
      setDeleteError(message);
    } finally {
      setBusyAction(null);
    }
  }

  async function removeStudent(student: AdminStudent): Promise<void> {
    if (busyAction) return;
    setBusyAction({ id: student.id, action: "delete-student" });
    setDeleteError(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${student.id}`, {
        method: "DELETE",
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = readError(
          data,
          "Could not delete the student account."
        );
        setError(message);
        setDeleteError(message);
        return;
      }
      setStudents((current) =>
        current.filter((item) => item.id !== student.id)
      );
      setLoading(true);
      setReloadKey((key) => key + 1);
      setPendingDeletion(null);
    } catch {
      const message = "Could not delete the student account. Try again.";
      setError(message);
      setDeleteError(message);
    } finally {
      setBusyAction(null);
    }
  }

  function requestProjectDeletion(
    project: ProjectManagementItem,
    location: "pending" | "all"
  ): void {
    if (busyAction) return;
    setDeleteError(null);
    setPendingDeletion({ type: "project", project, location });
  }

  function requestStudentDeletion(student: AdminStudent): void {
    if (busyAction) return;
    setDeleteError(null);
    setPendingDeletion({ type: "student", student });
  }

  function confirmDeletion(): void {
    if (!pendingDeletion || busyAction) return;
    if (pendingDeletion.type === "project") {
      void removeProject(pendingDeletion.project, pendingDeletion.location);
    } else {
      void removeStudent(pendingDeletion.student);
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
        <div
          role="status"
          aria-label="Loading admin dashboard"
          aria-busy="true"
          className="grid gap-8"
        >
          <span className="sr-only">Loading admin dashboard</span>
          {Array.from({ length: 2 }, (_, sectionIndex) => (
            <section
              key={sectionIndex}
              aria-hidden="true"
              className="border-foreground/10 grid gap-4 rounded-2xl border p-5"
            >
              <Skeleton className="h-7 w-48" />
              {Array.from({ length: 2 }, (_, itemIndex) => (
                <div
                  key={itemIndex}
                  className="border-foreground/10 flex items-center justify-between gap-4 rounded-xl border p-4"
                >
                  <div className="grid flex-1 gap-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
            </section>
          ))}
        </div>
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
                          By {project.authorName}
                          {project.authorGrade
                            ? ` · ${project.authorGrade}`
                            : ""}
                          {project.authorFamily
                            ? ` · ${project.authorFamily}`
                            : ""}
                          {" · "}
                          {projectTechnologyNames(
                            project.technologies,
                            project.language
                          ).join(", ") || "Technologies not specified"}{" "}
                          · {formatDate(project.createdAt)}
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
                        disabled={busyAction !== null}
                        className="focus-ring bg-foreground text-background rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        {busyAction?.id === project.id &&
                        busyAction.action === "approve" ? (
                          <LoadingIndicator label="Approving" />
                        ) : (
                          "Approve"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void reviewProject(project, "rejected")}
                        disabled={busyAction !== null}
                        className="focus-ring border-foreground/15 hover:bg-foreground/5 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        {busyAction?.id === project.id &&
                        busyAction.action === "reject" ? (
                          <LoadingIndicator label="Rejecting" />
                        ) : (
                          "Reject"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requestProjectDeletion(project, "pending")
                        }
                        disabled={busyAction !== null}
                        className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        {busyAction?.id === project.id &&
                        busyAction.action === "delete-pending-project" ? (
                          <LoadingIndicator label="Deleting" />
                        ) : (
                          <>
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                            Delete
                          </>
                        )}
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
                      onClick={() => requestProjectDeletion(project, "all")}
                      disabled={busyAction !== null}
                      className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      {busyAction?.id === project.id &&
                      busyAction.action === "delete-project" ? (
                        <LoadingIndicator label="Deleting" />
                      ) : (
                        <>
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                          Delete
                        </>
                      )}
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
                      onClick={() => requestStudentDeletion(student)}
                      disabled={busyAction !== null}
                      className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      {busyAction?.id === student.id &&
                      busyAction.action === "delete-student" ? (
                        <LoadingIndicator label="Deleting" />
                      ) : (
                        <>
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                          Delete student
                        </>
                      )}
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
      <dialog
        ref={confirmationDialogRef}
        aria-labelledby="delete-confirmation-title"
        aria-describedby="delete-confirmation-description"
        onCancel={(event) => {
          if (busyAction) {
            event.preventDefault();
            return;
          }
          setPendingDeletion(null);
        }}
        className="border-foreground/10 bg-background text-foreground m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border p-0 shadow-2xl backdrop:bg-black/60"
      >
        {pendingDeletion ? (
          <div className="p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Trash2 aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2
              id="delete-confirmation-title"
              className="text-lg font-semibold"
            >
              {pendingDeletion.type === "project"
                ? "Delete this project?"
                : "Delete this student account?"}
            </h2>
            <p
              id="delete-confirmation-description"
              className="text-foreground/65 mt-2 text-sm leading-relaxed"
            >
              {pendingDeletion.type === "project"
                ? `Permanently delete "${pendingDeletion.project.title}"? This action cannot be undone.`
                : `Delete ${pendingDeletion.student.email} and all of their projects? This action cannot be undone.`}
            </p>
            {deleteError ? (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300"
              >
                {deleteError}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={cancelDeleteButtonRef}
                type="button"
                disabled={busyAction !== null}
                onClick={() => setPendingDeletion(null)}
                className="focus-ring border-foreground/15 hover:bg-foreground/5 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={confirmDeletion}
                className="focus-ring inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyAction ? (
                  <LoadingIndicator label="Deleting" className="text-white" />
                ) : (
                  "Permanently delete"
                )}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
