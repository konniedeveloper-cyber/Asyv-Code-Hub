"use client";

import type { ProjectManagementItem, ProjectStatus } from "@/lib/types";
import { isRecord, readError } from "@/lib/parse";
import {
  projectTechnologyNames,
  readProjectTechnologies,
} from "@/lib/project-technologies";
import { LoadingIndicator, Skeleton } from "@/components/ui/loading";
import { ExternalLink, Pencil, RotateCw, Trash2 } from "lucide-react";
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

export function MyProjects(): ReactNode {
  const [projects, setProjects] = useState<ProjectManagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/projects/mine", { cache: "no-store" })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(
            response.status === 401
              ? "Sign in to see your projects."
              : readError(data, "Could not load your projects.")
          );
          return;
        }
        if (
          !isRecord(data) ||
          !Array.isArray(data.projects) ||
          !data.projects.every(isProject)
        ) {
          setError("The project list returned an unexpected response.");
          return;
        }
        setProjects(data.projects);
      })
      .catch(() => {
        if (active) {
          setError("Could not load your projects. Check your connection.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function removeProject(project: ProjectManagementItem): Promise<void> {
    if (deletingId || !window.confirm(`Delete "${project.title}"?`)) return;
    setDeletingId(project.id);
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
      setError("Could not delete the project. Check your connection.");
    } finally {
      setDeletingId(null);
    }
  }

  function retry(): void {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  return (
    <div className="mt-8">
      {error ? (
        <div
          role="alert"
          className="border-foreground/10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
        >
          <div>
            <p className="text-sm">{error}</p>
            {error === "Sign in to see your projects." ? (
              <Link
                href="/login"
                className="mt-2 inline-flex text-sm font-medium underline underline-offset-2"
              >
                Sign in
              </Link>
            ) : null}
          </div>
          {error !== "Sign in to see your projects." ? (
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
          aria-label="Loading your projects"
          aria-busy="true"
          className="grid gap-4"
        >
          <span className="sr-only">Loading your projects</span>
          {Array.from({ length: 3 }, (_, index) => (
            <article
              key={index}
              aria-hidden="true"
              className="border-foreground/10 grid gap-4 rounded-2xl border p-5 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="grid gap-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-20" />
              </div>
            </article>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="border-foreground/15 rounded-2xl border border-dashed px-6 py-12 text-center">
          <h2 className="text-lg font-medium">You haven&apos;t posted yet</h2>
          <p className="text-foreground/60 mt-2 text-sm">
            Your submissions and their review status will appear here.
          </p>
          <Link
            href="/submit"
            className="focus-ring bg-foreground text-background mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            Post a project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <article
              key={project.id}
              className="border-foreground/10 bg-background grid gap-4 rounded-2xl border p-5 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="truncate text-lg font-semibold">
                    {project.title}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[project.status]}`}
                  >
                    {project.status}
                  </span>
                  <time
                    dateTime={project.createdAt}
                    className="text-foreground/50 text-xs"
                  >
                    {formatDate(project.createdAt)}
                  </time>
                </div>
                <p className="text-foreground/60 mt-2 line-clamp-2 text-sm">
                  {project.description}
                </p>
                <p className="text-foreground/50 mt-2 text-xs">
                  {projectTechnologyNames(
                    project.technologies,
                    project.language
                  ).join(", ") || "Technologies not specified"}
                  {project.githubUrl ? (
                    <>
                      {" · "}
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        GitHub repository
                      </a>
                    </>
                  ) : null}
                </p>
                {project.status === "pending" ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Pending admin approval. Only approved projects appear in the
                    community feed.
                  </p>
                ) : project.status === "rejected" && project.reviewReason ? (
                  <p className="text-foreground/60 mt-2 text-xs">
                    Admin note: {project.reviewReason}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/submit?edit=${encodeURIComponent(project.id)}`}
                  className="focus-ring hover:bg-foreground/5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  Edit
                </Link>
                {project.kind === "files" ? (
                  <Link
                    href={`/projects/${project.id}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring hover:bg-foreground/5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                  >
                    Preview
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </Link>
                ) : project.url ? (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring hover:bg-foreground/5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                  >
                    Open project
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void removeProject(project)}
                  disabled={deletingId !== null}
                  className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  {deletingId === project.id ? (
                    <LoadingIndicator label="Deleting" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
