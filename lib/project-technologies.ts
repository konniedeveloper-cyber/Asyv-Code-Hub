import {
  PROJECT_TECHNOLOGY_OPTIONS,
  type ProjectTechnologies,
} from "@/lib/types";

export function emptyProjectTechnologies(): ProjectTechnologies {
  return {
    frameworks: [],
    programmingLanguages: [],
    stylingLanguages: [],
    databases: [],
  };
}

export function readProjectTechnologies(
  value: unknown
): ProjectTechnologies | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;

  const categories = Object.keys(PROJECT_TECHNOLOGY_OPTIONS) as Array<
    keyof typeof PROJECT_TECHNOLOGY_OPTIONS
  >;
  const technologies = emptyProjectTechnologies();

  for (const category of categories) {
    const selected = record[category];
    if (selected === undefined) continue;
    if (
      !Array.isArray(selected) ||
      selected.length > PROJECT_TECHNOLOGY_OPTIONS[category].length ||
      !selected.every(
        (name) =>
          typeof name === "string" &&
          (PROJECT_TECHNOLOGY_OPTIONS[category] as readonly string[]).includes(
            name
          )
      )
    ) {
      return null;
    }
    technologies[category] = [...new Set(selected)];
  }
  return technologies;
}

export function projectTechnologyNames(
  technologies: ProjectTechnologies,
  legacyLanguage = ""
): string[] {
  const names = Object.values(technologies).flat();
  if (names.length > 0) return [...new Set(names)];
  return legacyLanguage
    .split(/[,;]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}
