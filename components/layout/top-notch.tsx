"use client";

import Image from "next/image";
import { Power, Search, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type SearchProject = { id: string; title: string; description: string };

export function TopNotch(): ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [projects, setProjects] = useState<SearchProject[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!active) return;
        if (
          response.ok &&
          typeof data === "object" &&
          data !== null &&
          "user" in data &&
          typeof data.user === "object" &&
          data.user !== null
        ) {
          setSignedIn(true);
          setProfileImage(
            "profileImage" in data.user &&
              typeof data.user.profileImage === "string"
              ? data.user.profileImage
              : null
          );
        } else {
          setSignedIn(false);
          setProfileImage(null);
        }
      })
      .catch(() => {
        if (active) {
          setSignedIn(false);
          setProfileImage(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!focused) return;
    fetch("/api/projects", { cache: "no-store" })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (
          response.ok &&
          typeof data === "object" &&
          data !== null &&
          "projects" in data &&
          Array.isArray(data.projects)
        ) {
          setProjects(
            data.projects.filter(
              (project): project is SearchProject =>
                typeof project === "object" &&
                project !== null &&
                "id" in project &&
                typeof project.id === "string" &&
                "title" in project &&
                typeof project.title === "string" &&
                "description" in project &&
                typeof project.description === "string"
            )
          );
        }
      })
      .catch(() => setProjects([]));
  }, [focused]);

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = query.trim();
    router.push(
      value ? `/projects?q=${encodeURIComponent(value)}` : "/projects"
    );
  }

  const normalizedQuery = query.toLowerCase();
  const matches = projects
    .filter(
      (project) =>
        !normalizedQuery ||
        project.title.toLowerCase().includes(normalizedQuery) ||
        project.description.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, 4);

  return (
    <>
      <div className="top-notch" aria-label="Asyv Code Hub">
        <svg
          viewBox="0 0 320 72"
          aria-hidden="true"
          className="top-notch__shape"
        >
          <path d="M0 0H320C296 0 302 24 278 24C260 24 248 31 236 46C228 56 218 64 198 64H122C102 64 92 56 84 46C72 31 60 24 42 24C18 24 24 0 0 0Z" />
        </svg>
        <div className="top-notch__brand" aria-label="Asyv Code Hub">
          <Power
            aria-hidden="true"
            strokeWidth={3}
            className="top-notch__power"
          />
        </div>
      </div>

      <div className="top-controls">
        <form role="search" onSubmit={submitSearch} className="top-search">
          <label htmlFor="top-project-search" className="sr-only">
            Search projects
          </label>
          <input
            id="top-project-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
            placeholder="Search project"
          />
          <button type="submit" aria-label="Search projects">
            <Search aria-hidden="true" />
          </button>
        </form>

        {focused ? (
          <div className="top-search-popover">
            {matches.length ? (
              matches.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => router.push(`/projects/${project.id}/preview`)}
                >
                  <strong>{project.title}</strong>
                  <span>{project.description}</span>
                </button>
              ))
            ) : (
              <p>No matching projects</p>
            )}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => router.push(signedIn ? "/settings" : "/login")}
          aria-label={signedIn ? "Open profile" : "Sign in"}
          aria-current={pathname === "/settings" ? "page" : undefined}
          className="top-avatar"
        >
          {profileImage ? (
            <Image src={profileImage} alt="" fill sizes="44px" />
          ) : (
            <UserRound aria-hidden="true" />
          )}
        </button>
      </div>
    </>
  );
}
