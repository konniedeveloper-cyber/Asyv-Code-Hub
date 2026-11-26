import { LIMITS } from "@/lib/limits";
import { STUDENT_FAMILIES, STUDENT_GRADES } from "@/lib/types";
import type {
  Credentials,
  ProjectDraft,
  ProjectSourceFile,
  PublicUser,
  StudentFamily,
  StudentGrade,
} from "@/lib/types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readError(data: unknown, fallback: string): string {
  if (isRecord(data) && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }
  return fallback;
}

export function readUser(data: unknown): PublicUser | null {
  if (!isRecord(data) || !isRecord(data.user)) return null;
  const user = data.user;
  if (
    typeof user.id !== "string" ||
    typeof user.name !== "string" ||
    typeof user.email !== "string" ||
    (user.role !== "student" && user.role !== "admin") ||
    (user.profileImage !== undefined &&
      user.profileImage !== null &&
      typeof user.profileImage !== "string") ||
    (user.family !== undefined &&
      user.family !== null &&
      !isStudentFamily(user.family)) ||
    (user.grade !== undefined &&
      user.grade !== null &&
      !isStudentGrade(user.grade))
  ) {
    return null;
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage:
      typeof user.profileImage === "string" ? user.profileImage : null,
    family: isStudentFamily(user.family) ? user.family : null,
    grade: isStudentGrade(user.grade) ? user.grade : null,
  };
}

export function isStudentFamily(value: unknown): value is StudentFamily {
  return (
    typeof value === "string" &&
    (STUDENT_FAMILIES as readonly string[]).includes(value)
  );
}

export function isStudentGrade(value: unknown): value is StudentGrade {
  return (
    typeof value === "string" &&
    (STUDENT_GRADES as readonly string[]).includes(value)
  );
}

export function readProjectId(data: unknown): string | null {
  if (
    !isRecord(data) ||
    !isRecord(data.project) ||
    typeof data.project.id !== "string"
  ) {
    return null;
  }
  return data.project.id;
}

export function readLikeResult(
  data: unknown
): { liked: boolean; likeCount: number } | null {
  if (
    !isRecord(data) ||
    typeof data.liked !== "boolean" ||
    typeof data.likeCount !== "number"
  ) {
    return null;
  }
  return { liked: data.liked, likeCount: data.likeCount };
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

export function parseHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseGitHubUrl(
  value: string
): { ok: true; url: string | null } | { ok: false; error: string } {
  if (!value) return { ok: true, url: null };
  const parsed = parseHttpUrl(value);
  if (!parsed) {
    return {
      ok: false,
      error: "Enter a valid public GitHub repository URL.",
    };
  }
  const url = new URL(parsed);
  if (
    url.protocol !== "https:" ||
    !["github.com", "www.github.com", "gist.github.com"].includes(
      url.hostname
    ) ||
    url.pathname.split("/").filter(Boolean).length < 2
  ) {
    return {
      ok: false,
      error:
        "Use a public GitHub repository URL starting with https://github.com/.",
    };
  }
  return { ok: true, url: parsed };
}

function parseProjectFiles(
  input: Record<string, unknown>
): { ok: true; files: ProjectSourceFile[] } | { ok: false; error: string } {
  let files: ProjectSourceFile[];

  if (Array.isArray(input.files)) {
    files = [];
    for (const value of input.files) {
      if (
        !isRecord(value) ||
        typeof value.name !== "string" ||
        typeof value.content !== "string"
      ) {
        return { ok: false, error: "Each project file needs a name and code." };
      }
      files.push({ name: value.name.trim(), content: value.content });
    }
  } else {
    files = [
      {
        name: "index.html",
        content: typeof input.html === "string" ? input.html : "",
      },
      {
        name: "style.css",
        content: typeof input.css === "string" ? input.css : "",
      },
      {
        name: "script.js",
        content: typeof input.js === "string" ? input.js : "",
      },
    ];
  }

  if (files.length > LIMITS.projectFiles) {
    return {
      ok: false,
      error: `A project can include up to ${LIMITS.projectFiles} files.`,
    };
  }

  const names = new Set<string>();
  let totalLength = 0;
  for (const file of files) {
    if (!/^[a-z0-9][a-z0-9._-]{0,95}\.(html|css|js)$/i.test(file.name)) {
      return {
        ok: false,
        error:
          "File names must end in .html, .css, or .js and cannot include folders.",
      };
    }
    const key = file.name.toLowerCase();
    if (names.has(key)) {
      return {
        ok: false,
        error: `The file "${file.name}" is listed more than once.`,
      };
    }
    names.add(key);

    if (file.content.length > LIMITS.file) {
      return { ok: false, error: "Each file must be 100 KB or smaller." };
    }
    totalLength += file.content.length;
  }

  if (totalLength > LIMITS.projectTotal) {
    return {
      ok: false,
      error: "All project files together must be 1 MB or smaller.",
    };
  }
  if (
    !files.some(
      (file) => file.name.toLowerCase() === "index.html" && file.content.trim()
    )
  ) {
    return { ok: false, error: "Add a non-empty index.html entry file." };
  }

  return { ok: true, files };
}

function parseCoverImage(
  value: unknown
): { ok: true; coverImage: string | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, coverImage: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "Upload a valid cover image." };
  }

  const match =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
  if (!match || !match[2] || match[2].length % 4 !== 0) {
    return {
      ok: false,
      error: "Cover image must be a PNG, JPEG, or WebP image.",
    };
  }

  const padding = match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0;
  const size = Math.floor((match[2].length * 3) / 4) - padding;
  if (size > LIMITS.coverImage) {
    return {
      ok: false,
      error: "Cover image must be 250 KB or smaller after compression.",
    };
  }
  return { ok: true, coverImage: value };
}

export function parseCredentials(
  input: unknown,
  mode: "login" | "register"
): { ok: true; value: Credentials } | { ok: false; error: string } {
  if (!isRecord(input)) {
    return { ok: false, error: "Send account details as JSON." };
  }

  const email = readString(input, "email").toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > LIMITS.email
  ) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (
    password.length < LIMITS.passwordMin ||
    password.length > LIMITS.passwordMax
  ) {
    return {
      ok: false,
      error: `Password must be ${LIMITS.passwordMin} to ${LIMITS.passwordMax} characters.`,
    };
  }

  if (mode === "login") {
    return { ok: true, value: { mode: "login", email, password } };
  }

  const name = readString(input, "name");
  if (name.length < 2 || name.length > LIMITS.name) {
    return {
      ok: false,
      error: `Name must be 2 to ${LIMITS.name} characters.`,
    };
  }

  const family =
    input.family === undefined || input.family === null || input.family === ""
      ? null
      : isStudentFamily(input.family)
        ? input.family
        : undefined;
  const grade =
    input.grade === undefined || input.grade === null || input.grade === ""
      ? null
      : isStudentGrade(input.grade)
        ? input.grade
        : undefined;
  if (family === undefined) {
    return { ok: false, error: "Choose one of the listed student families." };
  }
  if (grade === undefined) {
    return { ok: false, error: "Choose one of the listed school grades." };
  }

  return {
    ok: true,
    value: { mode: "register", name, email, password, family, grade },
  };
}

export function parseProjectDraft(
  input: unknown
): { ok: true; draft: ProjectDraft } | { ok: false; error: string } {
  if (!isRecord(input)) {
    return { ok: false, error: "Send a project as JSON." };
  }

  const title = readString(input, "title");
  const description = readString(input, "description");
  const language = readString(input, "language");
  const kind = input.kind;

  if (title.length < 2 || title.length > LIMITS.title) {
    return {
      ok: false,
      error: `Title must be 2 to ${LIMITS.title} characters.`,
    };
  }

  if (description.length < 2 || description.length > LIMITS.description) {
    return {
      ok: false,
      error: `Description must be 2 to ${LIMITS.description} characters.`,
    };
  }

  if (language.length < 2 || language.length > 80) {
    return {
      ok: false,
      error: "Programming language must be 2 to 80 characters.",
    };
  }

  const githubResult = parseGitHubUrl(readString(input, "githubUrl"));
  if (!githubResult.ok) return githubResult;

  const coverResult = parseCoverImage(input.coverImage);
  if (!coverResult.ok) return coverResult;
  if (!coverResult.coverImage) {
    return {
      ok: false,
      error: "Add a project cover image before publishing.",
    };
  }

  if (kind === "link") {
    const url = parseHttpUrl(readString(input, "url"));
    if (!url) {
      return {
        ok: false,
        error: "Enter a project URL that starts with http:// or https://.",
      };
    }
    return {
      ok: true,
      draft: {
        kind: "link",
        title,
        description,
        language,
        githubUrl: githubResult.url,
        url,
        coverImage: coverResult.coverImage,
      },
    };
  }

  if (kind === "files") {
    const result = parseProjectFiles(input);
    if (!result.ok) return result;

    return {
      ok: true,
      draft: {
        kind: "files",
        title,
        description,
        language,
        githubUrl: githubResult.url,
        files: result.files,
        coverImage: coverResult.coverImage,
      },
    };
  }

  return { ok: false, error: "Choose a link or HTML, CSS, and JS files." };
}
