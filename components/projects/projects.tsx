"use client";

import { Code2, ExternalLink, Github, Link2, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import PulseHeart from "@/components/PulseHeart";
import { Skeleton } from "@/components/ui/loading";
import type { ProjectCard } from "@/lib/types";
import {
  projectTechnologyNames,
  readProjectTechnologies,
} from "@/lib/project-technologies";
import { isRecord, readError, readLikeResult } from "@/lib/parse";

export type ProjectsProps = {
  withHeadline?: boolean;
  viewMoreVisible?: boolean;
};

type ProjectSort = "newest" | "popular";

function isProjectCard(value: unknown): value is ProjectCard {
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
  const [sort, setSort] = useState<ProjectSort>("newest");
  const [query, setQuery] = useState("");
  const [technologyFilter, setTechnologyFilter] = useState("all");

  useEffect(() => {
    function syncQuery(): void {
      setQuery(
        new URLSearchParams(window.location.search).get("q")?.trim() ?? ""
      );
    }

    syncQuery();
    window.addEventListener("popstate", syncQuery);
    return () => window.removeEventListener("popstate", syncQuery);
  }, []);

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

  const availableTechnologies = useMemo(
    () =>
      [
        ...new Set(
          projects.flatMap((project) =>
            projectTechnologyNames(project.technologies, project.language)
          )
        ),
      ].sort((left, right) => left.localeCompare(right)),
    [projects]
  );

  const sortedProjects = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    const matchingProjects = projects.filter((project) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          project.title,
          project.description,
          project.authorName,
          project.authorFamily ?? "",
          project.authorGrade ?? "",
          ...projectTechnologyNames(project.technologies, project.language),
          project.kind,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesTechnology =
        technologyFilter === "all" ||
        projectTechnologyNames(project.technologies, project.language).some(
          (technology) =>
            technology.toLowerCase() === technologyFilter.toLowerCase()
        );
      return matchesQuery && matchesTechnology;
    });

    return [...matchingProjects].sort((left, right) => {
      if (sort === "popular") {
        const popularityDifference = right.likeCount - left.likeCount;
        if (popularityDifference !== 0) return popularityDifference;
      }
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });
  }, [projects, query, sort, technologyFilter]);

  const visibleProjects = viewMoreVisible
    ? sortedProjects.slice(0, 6)
    : sortedProjects;

  function updateProjectLike(
    projectId: string,
    likedByMe: boolean,
    likeCount: number
  ): void {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? { ...project, likedByMe, likeCount }
          : project
      )
    );
  }

  return (
    <section className="relative w-full">
      <div className="mx-auto w-full max-w-275 px-6 sm:px-10">
        {withHeadline ? (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
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

        {!loading && !error && projects.length > 0 ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <label className="text-foreground/50 flex items-center gap-2 text-xs font-medium tracking-[0.12em] uppercase">
              Technology
              <span className="technology-filter__control">
                <select
                  value={technologyFilter}
                  onChange={(event) => setTechnologyFilter(event.target.value)}
                  aria-label="Filter projects by technology"
                  className="border-foreground/10 bg-background text-foreground focus-ring appearance-none rounded-lg border py-2 pr-11 pl-3 text-sm tracking-normal normal-case"
                >
                  <option value="all">All technologies</option>
                  {availableTechnologies.map((technology) => (
                    <option key={technology} value={technology}>
                      {technology}
                    </option>
                  ))}
                </select>
                <svg
                  className="student-details-chevron pointer-events-none absolute top-1/2 right-1.5 h-8 w-8 -translate-y-1/2"
                  viewBox="0 0 32 32"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="student-details-chevron-circle"
                    cx="16"
                    cy="16"
                    r="13"
                  />
                  <path
                    className="student-details-chevron-arrow"
                    d="M10.5 13.5h11L16 20z"
                  />
                </svg>
              </span>
            </label>
            <div
              role="group"
              aria-label="Sort projects"
              className="border-foreground/10 bg-background flex rounded-xl border p-1"
            >
              <button
                type="button"
                aria-pressed={sort === "newest"}
                onClick={() => setSort("newest")}
                className={`focus-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  sort === "newest"
                    ? "bg-foreground text-background"
                    : "text-foreground/65 hover:bg-foreground/5"
                }`}
              >
                Newest
              </button>
              <button
                type="button"
                aria-pressed={sort === "popular"}
                onClick={() => setSort("popular")}
                className={`focus-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  sort === "popular"
                    ? "bg-foreground text-background"
                    : "text-foreground/65 hover:bg-foreground/5"
                }`}
              >
                Popular
              </button>
            </div>
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
          <div
            role="status"
            aria-label="Loading projects"
            aria-busy="true"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <span className="sr-only">Loading projects</span>
            {Array.from({ length: 3 }, (_, index) => (
              <article
                key={index}
                aria-hidden="true"
                className="border-foreground/10 bg-background overflow-hidden rounded-3xl border"
              >
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="grid gap-3 p-5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="mt-2 flex justify-between gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="border-foreground/10 mt-2 flex justify-between border-t pt-4">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="border-foreground/15 rounded-2xl border border-dashed px-6 py-12 text-center">
            <h3 className="text-lg font-medium">
              {projects.length
                ? "No projects match these filters"
                : "No projects yet"}
            </h3>
            <p className="text-foreground/60 mt-2 text-sm">
              {projects.length
                ? "Try another search or technology."
                : "Be the first to share something you&apos;ve built."}
            </p>
            {projects.length ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setTechnologyFilter("all");
                }}
                className="focus-ring border-foreground/10 hover:bg-foreground/5 mt-5 inline-flex rounded-xl border px-4 py-2.5 text-sm font-medium"
              >
                Clear filters
              </button>
            ) : (
              <Link
                href="/submit"
                className="focus-ring bg-foreground text-background mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-medium"
              >
                Post a project
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project) => (
              <ProjectCardView
                key={project.id}
                project={project}
                onLikeChange={updateProjectLike}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectCardView({
  project,
  onLikeChange,
}: {
  project: ProjectCard;
  onLikeChange: (
    projectId: string,
    likedByMe: boolean,
    likeCount: number
  ) => void;
}): ReactNode {
  const [liked, setLiked] = useState(project.likedByMe);
  const [likeCount, setLikeCount] = useState(project.likeCount);
  const [error, setError] = useState<string | null>(null);
  const [savingLike, setSavingLike] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  async function toggleLike(
    nextLiked: boolean,
    nextCount: number
  ): Promise<void> {
    if (savingLike) return;
    const previousLiked = liked;
    const previousCount = likeCount;
    setSavingLike(true);
    setError(null);
    setLiked(nextLiked);
    setLikeCount(nextCount);
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
        setLiked(previousLiked);
        setLikeCount(previousCount);
        setPulseKey((key) => key + 1);
        return;
      }
      const result = readLikeResult(data);
      if (!result) {
        setError("The like action returned an unexpected response.");
        setLiked(previousLiked);
        setLikeCount(previousCount);
        setPulseKey((key) => key + 1);
        return;
      }
      setLiked(result.liked);
      setLikeCount(result.likeCount);
      onLikeChange(project.id, result.liked, result.likeCount);
    } catch {
      setError("Could not update your like. Try again.");
      setLiked(previousLiked);
      setLikeCount(previousCount);
      setPulseKey((key) => key + 1);
    } finally {
      setSavingLike(false);
    }
  }

  const technologyNames = projectTechnologyNames(
    project.technologies,
    project.language
  );

  return (
    <article
      id={project.id}
      className="project-card border-foreground/10 bg-background flex min-w-0 flex-col overflow-hidden rounded-3xl border"
    >
      {project.coverImage ? (
        <div
          role="img"
          aria-label={`Cover image for ${project.title}`}
          className="border-foreground/10 aspect-[16/10] w-full border-b bg-cover bg-center"
          style={{ backgroundImage: `url("${project.coverImage}")` }}
        />
      ) : project.kind === "files" ? (
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
        <div className="text-foreground/50 mb-3 flex flex-wrap items-center gap-2 text-xs font-medium tracking-[0.12em] uppercase">
          <span className="inline-flex items-center gap-2">
            {project.kind === "files" ? (
              <Code2 aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Link2 aria-hidden="true" className="h-4 w-4" />
            )}
            {project.kind === "files" ? "HTML project" : "External project"}
          </span>
        </div>
        <h3 className="text-xl leading-snug font-semibold tracking-tight">
          {project.title}
        </h3>
        {technologyNames.length > 0 ? (
          <div
            aria-label="Technologies used"
            className="mt-3 flex flex-wrap gap-1.5"
          >
            {technologyNames.slice(0, 6).map((technology) => (
              <span
                key={technology}
                className="border-foreground/10 bg-foreground/[0.03] text-foreground/65 rounded-full border px-2.5 py-1 text-[11px]"
              >
                {technology}
              </span>
            ))}
            {technologyNames.length > 6 ? (
              <span className="text-foreground/50 px-1 py-1 text-[11px]">
                +{technologyNames.length - 6}
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="text-foreground/65 mt-2 line-clamp-3 text-sm leading-relaxed">
          {project.description}
        </p>

        <div className="text-foreground/50 mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span>
            By {project.authorName}
            {project.authorGrade
              ? ` · Grade: ${project.authorGrade}`
              : " · Grade not specified"}
            {project.authorFamily ? ` · ${project.authorFamily}` : ""}
          </span>
          <time dateTime={project.createdAt}>
            {formatDate(project.createdAt)}
          </time>
        </div>

        <div className="border-foreground/10 mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <div className="flex flex-wrap items-center gap-1">
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
              <Link
                href={`/projects/${project.id}/preview`}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium"
              >
                Open preview
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
            {project.githubUrl ? (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium"
              >
                <Github aria-hidden="true" className="h-4 w-4" />
                GitHub
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
          <PulseHeart
            key={pulseKey}
            liked={liked}
            count={likeCount}
            onChange={(nextLiked, nextCount) =>
              void toggleLike(nextLiked, nextCount)
            }
            disabled={savingLike}
            label={`${liked ? "Unlike" : "Like"} ${project.title}`}
            size={24}
            className="focus-ring"
          />
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
