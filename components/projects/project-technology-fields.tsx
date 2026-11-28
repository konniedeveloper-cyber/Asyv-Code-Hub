"use client";

import {
  PROJECT_TECHNOLOGY_OPTIONS,
  type ProjectTechnologies,
  type ProjectTechnologyCategory,
} from "@/lib/types";
import type { ReactNode } from "react";

const CATEGORY_LABELS: Record<ProjectTechnologyCategory, string> = {
  frameworks: "Frameworks",
  programmingLanguages: "Programming languages",
  stylingLanguages: "Styling languages",
  databases: "Databases",
};

const CATEGORIES = Object.keys(
  PROJECT_TECHNOLOGY_OPTIONS
) as ProjectTechnologyCategory[];

export function ProjectTechnologyFields({
  value,
  onChange,
}: {
  value: ProjectTechnologies;
  onChange: (technologies: ProjectTechnologies) => void;
}): ReactNode {
  function toggleTechnology(
    category: ProjectTechnologyCategory,
    technology: string,
    checked: boolean
  ): void {
    const selected = value[category];
    onChange({
      ...value,
      [category]: checked
        ? [...selected, technology]
        : selected.filter((item) => item !== technology),
    });
  }

  return (
    <fieldset className="mt-3 grid gap-3">
      <legend className="text-sm font-medium">
        Technologies used{" "}
        <span className="text-foreground/50 font-normal">(optional)</span>
      </legend>
      <p className="text-foreground/55 -mt-2 text-xs">
        Choose any that apply. You can select more than one in each category.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CATEGORIES.map((category) => {
          const selected = value[category];
          return (
            <details
              key={category}
              className="student-details-disclosure border-foreground/10 rounded-xl border px-3 py-2.5"
            >
              <summary className="student-details-summary focus-ring flex w-full cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                <span>
                  {CATEGORY_LABELS[category]}{" "}
                  <span className="text-foreground/50 font-normal">
                    {selected.length
                      ? `${selected.length} selected`
                      : "(optional)"}
                  </span>
                </span>
                <svg
                  className="student-details-chevron h-8 w-8 shrink-0"
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
              </summary>
              <div
                data-lenis-prevent
                className="border-foreground/10 mt-2 grid max-h-52 gap-1 overflow-y-auto overscroll-contain border-t pt-2"
              >
                {PROJECT_TECHNOLOGY_OPTIONS[category].map((technology) => {
                  const id = `${category}-${technology
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")}`;
                  return (
                    <label
                      key={technology}
                      htmlFor={id}
                      className="hover:bg-foreground/5 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={selected.includes(technology)}
                        onChange={(event) =>
                          toggleTechnology(
                            category,
                            technology,
                            event.target.checked
                          )
                        }
                        className="accent-foreground h-4 w-4 shrink-0"
                      />
                      {technology}
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </fieldset>
  );
}
