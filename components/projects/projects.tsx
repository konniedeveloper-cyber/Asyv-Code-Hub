"use client";

import { Code2, ExternalLink, Heart, Link2, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import type { ProjectCard } from "@/lib/types";
import { isRecord, readError, readLikeResult } from "@/lib/parse";

export type ProjectsProps = {
  withHeadline?: boolean;
  viewMoreVisible?: boolean;
};

function isProjectCard(value: unknown): value is ProjectCard {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    (value.kind === "link" || value.kind === "files") &&
    (value.url === null || typeof value.url === "string") &&
    typeof value.authorName === "string" &&
    typeof value.likeCount === "number" &&
    typeof value.likedByMe === "boolean" &&
    typeof value.createdAt === "string"
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function Projects({
  withHeadline = false,
  viewMoreVisible = false,
}: ProjectsProps): ReactNode {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/projects", { cache: "no-store" })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(readError(data, "Could not load projects."));
          return;
        }
        if (
          !isRecord(data) ||
          !Array.isArray(data.projects) ||
          !data.projects.every(isProjectCard)
        ) {
          setError("The project list returned an unexpected response.");
          return;
        }
        setProjects(data.projects);
      })
      .catch(() => {
        if (active) {
          setError(
            "Could not load projects. Check your connection and try again."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function retryLoading(): void {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  const visibleProjects = viewMoreVisible ? projects.slice(0, 6) : projects;

  return (
    <section className="relative w-full">
      <div className="mx-auto w-full max-w-275 px-6 sm:px-10">
        {withHeadline ? (
          <div className="mb-8 flex items-end justify-between gap-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Community projects
              </h2>
              <p className="text-foreground/60 mt-2 text-sm sm:text-base">
                Fresh work from Asyv School students.
              </p>
            </div>
            {viewMoreVisible ? (
              <Link
                href="/projects"
                className="focus-ring hover:bg-foreground/5 shrink-0 rounded-lg px-3 py-2 text-sm font-medium"
              >
                Explore all
              </Link>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="border-foreground/10 bg-background flex flex-col items-start gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-foreground/70 text-sm">{error}</p>
            <button
              type="button"
              onClick={retryLoading}
              className="focus-ring hover:bg-foreground/5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
            >
              <RotateCw aria-hidden="true" className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : loading ? (
          <p role="status" className="text-foreground/60 py-12 text-center">
            Loading projects…
          </p>
        ) : visibleProjects.length === 0 ? (
          <div className="border-foreground/15 rounded-2xl border border-dashed px-6 py-12 text-center">
            <h3 className="text-lg font-medium">No projects yet</h3>
            <p className="text-foreground/60 mt-2 text-sm">
              Be the first to share something you&apos;ve built.
            </p>
            <Link
              href="/submit"
              className="focus-ring bg-foreground text-background mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              Post a project
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project) => (
              <ProjectCardView key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectCardView({ project }: { project: ProjectCard }): ReactNode {
  const [liked, setLiked] = useState(project.likedByMe);
  const [likeCount, setLikeCount] = useState(project.likeCount);
  const [error, setError] = useState<string | null>(null);
  const [savingLike, setSavingLike] = useState(false);

  async function toggleLike(): Promise<void> {
    if (savingLike) return;
    setSavingLike(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/like`, {
        method: "POST",
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = readError(data, "Could not update your like.");
        setError(
          response.status === 401 ? "Sign in to like projects." : message
        );
        return;
      }
      const result = readLikeResult(data);
      if (!result) {
        setError("The like action returned an unexpected response.");
        return;
      }
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      setError("Could not update your like. Try again.");
    } finally {
      setSavingLike(false);
    }
  }

  return (
    <article
      id={project.id}
      className="project-card border-foreground/10 bg-background flex min-w-0 flex-col overflow-hidden rounded-3xl border"
    >
      {project.kind === "files" ? (
        <iframe
          title={`Preview of ${project.title}`}
          src={`/api/projects/${project.id}/preview`}
          sandbox="allow-scripts"
          loading="lazy"
          className="border-foreground/10 aspect-[16/10] w-full border-b bg-white"
        />
      ) : (
        <div className="border-foreground/10 bg-foreground/[0.03] flex aspect-[16/10] flex-col items-center justify-center gap-3 border-b">
          <Link2 aria-hidden="true" className="text-foreground/50 h-9 w-9" />
          <span className="text-foreground/50 text-xs font-medium tracking-[0.16em] uppercase">
            Linked project
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="text-foreground/50 mb-3 flex items-center gap-2 text-xs font-medium tracking-[0.12em] uppercase">
          {project.kind === "files" ? (
            <Code2 aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Link2 aria-hidden="true" className="h-4 w-4" />
          )}
          {project.kind === "files" ? "HTML project" : "External project"}
        </div>
        <h3 className="text-xl leading-snug font-semibold tracking-tight">
          {project.title}
        </h3>
        <p className="text-foreground/65 mt-2 line-clamp-3 text-sm leading-relaxed">
          {project.description}
        </p>

        <div className="text-foreground/50 mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span>By {project.authorName}</span>
          <time dateTime={project.createdAt}>
            {formatDate(project.createdAt)}
          </time>
        </div>

        <div className="border-foreground/10 mt-5 flex items-center justify-between border-t pt-4">
          {project.kind === "link" && project.url ? (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium"
            >
              Open project
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : (
            <span className="text-foreground/55 inline-flex items-center gap-2 text-sm">
              <Code2 aria-hidden="true" className="h-4 w-4" />
              Live preview
            </span>
          )}
          <button
            type="button"
            onClick={() => void toggleLike()}
            disabled={savingLike}
            aria-label={`${liked ? "Unlike" : "Like"} ${project.title}; ${likeCount} likes`}
            aria-pressed={liked}
            className="focus-ring hover:bg-foreground/5 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors disabled:opacity-50"
          >
            <Heart
              aria-hidden="true"
              className={`h-4 w-4 ${liked ? "fill-current text-rose-500" : ""}`}
            />
            {likeCount}
          </button>
        </div>
        {error ? (
          <p role="status" className="text-foreground/60 mt-2 text-xs">
            {error}{" "}
            {error === "Sign in to like projects." ? (
              <Link href="/login" className="underline underline-offset-2">
                Sign in
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </article>
  );
}
