import { LIMITS } from "@/lib/limits";
import type { Credentials, ProjectDraft, PublicUser } from "@/lib/types";

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
    typeof user.email !== "string"
  ) {
    return null;
  }
  return { id: user.id, name: user.name, email: user.email };
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

export function parseCredentials(
  input: unknown,
  mode: "login" | "register"
): { ok: true; value: Credentials } | { ok: false; error: string } {
  if (!isRecord(input)) {
    return { ok: false, error: "Send account details as JSON." };
  }

  const email = readString(input, "email").toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > LIMITS.email) {
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

  return { ok: true, value: { mode: "register", name, email, password } };
}

export function parseProjectDraft(
  input: unknown
): { ok: true; draft: ProjectDraft } | { ok: false; error: string } {
  if (!isRecord(input)) {
    return { ok: false, error: "Send a project as JSON." };
  }

  const title = readString(input, "title");
  const description = readString(input, "description");
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

  if (kind === "link") {
    const url = parseHttpUrl(readString(input, "url"));
    if (!url) {
      return {
        ok: false,
        error: "Enter a project URL that starts with http:// or https://.",
      };
    }
    return { ok: true, draft: { kind: "link", title, description, url } };
  }

  if (kind === "files") {
    const html = typeof input.html === "string" ? input.html : "";
    const css = typeof input.css === "string" ? input.css : "";
    const js = typeof input.js === "string" ? input.js : "";

    if (!html.trim()) {
      return { ok: false, error: "Add an index.html file." };
    }

    if (
      html.length > LIMITS.file ||
      css.length > LIMITS.file ||
      js.length > LIMITS.file
    ) {
      return { ok: false, error: "Each file must be 100 KB or smaller." };
    }

    return {
      ok: true,
      draft: { kind: "files", title, description, html, css, js },
    };
  }

  return { ok: false, error: "Choose a link or HTML, CSS, and JS files." };
}
