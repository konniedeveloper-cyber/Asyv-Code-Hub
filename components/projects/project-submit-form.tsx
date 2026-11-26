"use client";

import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import { buildPreviewDocument } from "@/lib/preview-document";
import { isRecord, readError, readProjectId, readUser } from "@/lib/parse";
import { LIMITS } from "@/lib/limits";
import { STUDENT_FAMILIES, STUDENT_GRADES } from "@/lib/types";
import { LoadingIndicator, Skeleton } from "@/components/ui/loading";
import { Code2, ExternalLink, Link2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

type ProjectKind = "link" | "files";
type CodeLanguage = "html" | "css" | "javascript";
type AdditionalFile = {
  id: string;
  name: string;
  content: string;
};

const fieldClassName =
  "focus-ring mt-2 w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-foreground/35 focus:border-foreground/30";
const CODE_LANGUAGES: Record<CodeLanguage, Extension> = {
  html: html(),
  css: css(),
  javascript: javascript(),
};

const CODE_HIGHLIGHTING = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: "var(--code-keyword)" },
    { tag: tags.string, color: "var(--code-string)" },
    { tag: tags.number, color: "var(--code-number)" },
    { tag: tags.bool, color: "var(--code-number)" },
    { tag: tags.null, color: "var(--code-number)" },
    { tag: tags.comment, color: "var(--code-comment)" },
    { tag: tags.propertyName, color: "var(--code-property)" },
    { tag: tags.attributeName, color: "var(--code-attribute)" },
    { tag: tags.attributeValue, color: "var(--code-string)" },
    { tag: tags.tagName, color: "var(--code-tag)" },
    { tag: tags.function(tags.variableName), color: "var(--code-property)" },
    {
      tag: tags.definition(tags.variableName),
      color: "var(--code-definition)",
    },
    { tag: tags.typeName, color: "var(--code-attribute)" },
    { tag: tags.operator, color: "var(--code-definition)" },
    { tag: tags.punctuation, color: "var(--code-punctuation)" },
    { tag: tags.meta, color: "var(--code-keyword)" },
  ])
);

const CODE_EDITOR_THEME = EditorView.theme({
  "&": {
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    fontSize: "13px",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
    lineHeight: "1.65",
  },
  ".cm-content": {
    minHeight: "9rem",
    padding: "0.8rem 0",
    caretColor: "var(--foreground)",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--muted-foreground)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--foreground) 5%, transparent)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--foreground)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--foreground)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "color-mix(in srgb, var(--ring) 28%, transparent)",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

function getCodeLanguage(filename: string): CodeLanguage {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "css") return "css";
  if (extension === "js") return "javascript";
  return "html";
}

function readDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("The image could not be read."));
    };
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

async function compressCoverImage(file: File): Promise<string> {
  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("The selected file is not a valid image."));
  });
  image.src = await readDataUrl(file);
  await loaded;
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("The selected file is not a valid image.");
  }

  const scale = Math.min(
    1,
    1280 / image.naturalWidth,
    800 / image.naturalHeight
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the cover image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.8, 0.65, 0.5]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );
    if (!blob) throw new Error("Could not compress the cover image.");
    if (blob.size <= LIMITS.coverImage) return readDataUrl(blob);
  }
  throw new Error(
    "The compressed cover image is still too large. Choose a simpler image."
  );
}

export function ProjectSubmitForm({
  projectId = null,
}: {
  projectId?: string | null;
}): ReactNode {
  const router = useRouter();
  const [kind, setKind] = useState<ProjectKind>("files");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [js, setJs] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<AdditionalFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(projectId !== null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileDetails, setProfileDetails] = useState<{
    family: string | null;
    grade: string | null;
  } | null>(null);
  const [family, setFamily] = useState("");
  const [grade, setGrade] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!active) return;
        if (!response.ok || !isRecord(data) || !("user" in data)) {
          setError(readError(data, "Could not load your student profile."));
          return;
        }
        const user = readUser(data);
        if (!user) {
          setError("Sign in before posting a project.");
          return;
        }
        setProfileDetails({ family: user.family, grade: user.grade });
        setFamily(user.family ?? "");
        setGrade(user.grade ?? "");
      })
      .catch(() => {
        if (active) setError("Could not load your student profile.");
      })
      .finally(() => {
        if (active) setProfileLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let active = true;

    fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(readError(data, "Could not load the project for editing."));
          return;
        }
        if (typeof data !== "object" || data === null || !("project" in data)) {
          setError("The project returned an unexpected response.");
          return;
        }
        const project = data.project;
        if (
          typeof project !== "object" ||
          project === null ||
          !("kind" in project) ||
          !("title" in project) ||
          !("description" in project) ||
          !("coverImage" in project) ||
          !("language" in project) ||
          !("githubUrl" in project)
        ) {
          setError("The project returned an unexpected response.");
          return;
        }

        setKind(project.kind === "link" ? "link" : "files");
        setTitle(typeof project.title === "string" ? project.title : "");
        setDescription(
          typeof project.description === "string" ? project.description : ""
        );
        setLanguage(
          typeof project.language === "string" ? project.language : ""
        );
        setGithubUrl(
          typeof project.githubUrl === "string" ? project.githubUrl : ""
        );
        setCoverImage(
          typeof project.coverImage === "string" ? project.coverImage : null
        );

        if (
          project.kind === "link" &&
          "url" in project &&
          typeof project.url === "string"
        ) {
          setUrl(project.url);
        } else if (project.kind === "files" && "files" in project) {
          const files = Array.isArray(project.files) ? project.files : [];
          const readFile = (name: string) =>
            files.find(
              (file) =>
                typeof file === "object" &&
                file !== null &&
                "name" in file &&
                typeof file.name === "string" &&
                file.name.toLowerCase() === name &&
                "content" in file &&
                typeof file.content === "string"
            );
          const index = readFile("index.html");
          const style = readFile("style.css");
          const script = readFile("script.js");
          setHtml(
            index && "content" in index && typeof index.content === "string"
              ? index.content
              : ""
          );
          setCss(
            style && "content" in style && typeof style.content === "string"
              ? style.content
              : ""
          );
          setJs(
            script && "content" in script && typeof script.content === "string"
              ? script.content
              : ""
          );
          setAdditionalFiles(
            files
              .filter(
                (file) =>
                  typeof file === "object" &&
                  file !== null &&
                  "name" in file &&
                  typeof file.name === "string" &&
                  !["index.html", "style.css", "script.js"].includes(
                    file.name.toLowerCase()
                  ) &&
                  "content" in file &&
                  typeof file.content === "string"
              )
              .map((file) => ({
                id: crypto.randomUUID(),
                name: file.name as string,
                content: file.content as string,
              }))
          );
        }
        setError(null);
      })
      .catch(() => {
        if (active) setError("Could not load the project for editing.");
      })
      .finally(() => {
        if (active) setLoadingEdit(false);
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  async function loadCoverImage(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPEG, or WebP cover image.");
      return;
    }
    if (file.size > LIMITS.coverUpload) {
      setError("The original cover image must be 5 MB or smaller.");
      return;
    }

    try {
      setCoverImage(await compressCoverImage(file));
      setError(null);
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "Could not process the cover image."
      );
    }
  }

  async function loadFile(
    event: ChangeEvent<HTMLInputElement>,
    setContent: (value: string) => void
  ): Promise<void> {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (file.size > LIMITS.file) {
      setError("Each file must be 100 KB or smaller.");
      event.currentTarget.value = "";
      return;
    }
    try {
      setContent(await file.text());
      setError(null);
    } catch {
      setError(`Could not read ${file.name}. Choose the file again.`);
    }
  }

  async function loadAdditionalFiles(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (selected.length === 0) return;

    const availableSlots = LIMITS.projectFiles - 3 - additionalFiles.length;
    if (selected.length > availableSlots) {
      setError(`A project can include up to ${LIMITS.projectFiles} files.`);
      return;
    }

    const names = new Set([
      "index.html",
      "style.css",
      "script.js",
      ...additionalFiles.map((file) => file.name.toLowerCase()),
    ]);
    for (const file of selected) {
      if (!/^[a-z0-9][a-z0-9._-]{0,95}\.(html|css|js)$/i.test(file.name)) {
        setError(
          "Choose .html, .css, or .js files without folders in their names."
        );
        return;
      }
      if (names.has(file.name.toLowerCase())) {
        setError(`A file named "${file.name}" is already in this project.`);
        return;
      }
      names.add(file.name.toLowerCase());
      if (file.size > LIMITS.file) {
        setError("Each file must be 100 KB or smaller.");
        return;
      }
    }

    try {
      const loaded = await Promise.all(
        selected.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          content: await file.text(),
        }))
      );
      setAdditionalFiles((current) => [...current, ...loaded]);
      setError(null);
    } catch {
      setError("Could not read one or more files. Choose them again.");
    }
  }

  function addAdditionalFile(): void {
    if (additionalFiles.length >= LIMITS.projectFiles - 3) {
      setError(`A project can include up to ${LIMITS.projectFiles} files.`);
      return;
    }
    let number = 1;
    let name = `page-${number}.html`;
    const names = new Set([
      "index.html",
      "style.css",
      "script.js",
      ...additionalFiles.map((file) => file.name.toLowerCase()),
    ]);
    while (names.has(name.toLowerCase())) {
      number += 1;
      name = `page-${number}.html`;
    }
    setAdditionalFiles((current) => [
      ...current,
      { id: crypto.randomUUID(), name, content: "" },
    ]);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    if (!profileLoaded) {
      setError("Please wait while your student profile loads.");
      return;
    }
    if (!profileDetails) {
      setError("Sign in before posting a project.");
      return;
    }
    if (
      (!profileDetails.family || !profileDetails.grade) &&
      (!family || !grade)
    ) {
      setError("Choose your family and grade before posting.");
      return;
    }
    if (!coverImage) {
      setError("Add a project cover image before publishing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const draft =
      kind === "link"
        ? { kind, title, description, language, githubUrl, url, coverImage }
        : {
            kind,
            title,
            description,
            language,
            githubUrl,
            coverImage,
            files: [
              { name: "index.html", content: html },
              { name: "style.css", content: css },
              { name: "script.js", content: js },
              ...additionalFiles.map(({ name, content }) => ({
                name,
                content,
              })),
            ],
          };

    try {
      if (!profileDetails.family || !profileDetails.grade) {
        const profileResponse = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ family, grade }),
        });
        const profileData: unknown = await profileResponse.json();
        const updatedUser = readUser(profileData);
        if (!profileResponse.ok || !updatedUser) {
          setError(
            readError(
              profileData,
              "Could not save your family and grade to your profile."
            )
          );
          return;
        }
        setProfileDetails({
          family: updatedUser.family,
          grade: updatedUser.grade,
        });
      }

      const response = await fetch(
        projectId
          ? `/api/projects/${encodeURIComponent(projectId)}`
          : "/api/projects",
        {
          method: projectId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        }
      );
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = readError(
          data,
          projectId
            ? "Could not save your project."
            : "Could not publish your project."
        );
        setError(
          response.status === 401
            ? "Sign in before publishing a project."
            : message
        );
        return;
      }
      if (!readProjectId(data)) {
        setError(
          "The server saved the project but returned an invalid response."
        );
        return;
      }
      router.push("/my-projects");
      router.refresh();
    } catch {
      setError(
        "Could not publish your project. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {loadingEdit ? (
        <div
          role="status"
          aria-label="Loading project for editing"
          aria-busy="true"
          className="border-foreground/10 grid gap-4 rounded-xl border p-5"
        >
          <span className="sr-only">Loading project for editing</span>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-2/3" />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Project title
          <input
            required
            minLength={2}
            maxLength={LIMITS.title}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="My first web project"
            className={fieldClassName}
          />
        </label>
        <div className="text-sm font-medium">
          What are you sharing?
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={kind === "files"}
              onClick={() => setKind("files")}
              className={`focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm transition-colors ${
                kind === "files"
                  ? "border-foreground/25 bg-foreground/5"
                  : "border-foreground/10 hover:bg-foreground/5"
              }`}
            >
              <Code2 aria-hidden="true" className="h-4 w-4" />
              HTML, CSS, JS
            </button>
            <button
              type="button"
              aria-pressed={kind === "link"}
              onClick={() => setKind("link")}
              className={`focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm transition-colors ${
                kind === "link"
                  ? "border-foreground/25 bg-foreground/5"
                  : "border-foreground/10 hover:bg-foreground/5"
              }`}
            >
              <Link2 aria-hidden="true" className="h-4 w-4" />
              Project link
            </button>
          </div>
        </div>
      </div>

      <label className="text-sm font-medium">
        Description (what problem does it solve?)
        <textarea
          required
          minLength={2}
          maxLength={LIMITS.description}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe what your project does and the problem it solves."
          rows={3}
          className={`${fieldClassName} resize-y`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Programming language
          <input
            required
            minLength={2}
            maxLength={80}
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="e.g. JavaScript, Python, HTML/CSS"
            className={fieldClassName}
          />
        </label>
        <label className="text-sm font-medium">
          Public GitHub repository{" "}
          <span className="text-foreground/50 font-normal">(optional)</span>
          <input
            type="url"
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            placeholder="https://github.com/owner/repository"
            className={fieldClassName}
          />
        </label>
      </div>

      {profileLoaded && profileDetails ? (
        !profileDetails.family || !profileDetails.grade ? (
          <section className="border-foreground/10 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
            <p className="text-foreground/60 text-xs leading-relaxed sm:col-span-2">
              Add these once to your profile. They&apos;ll be reused on your
              future project posts.
            </p>
            <label className="text-sm font-medium">
              Family
              <select
                required
                value={family}
                onChange={(event) => setFamily(event.target.value)}
                className={fieldClassName}
              >
                <option value="">Choose your family</option>
                {STUDENT_FAMILIES.map((studentFamily) => (
                  <option key={studentFamily} value={studentFamily}>
                    {studentFamily}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Grade
              <select
                required
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className={fieldClassName}
              >
                <option value="">Choose your grade</option>
                {STUDENT_GRADES.map((studentGrade) => (
                  <option key={studentGrade} value={studentGrade}>
                    {studentGrade}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : (
          <p className="text-foreground/55 text-xs">
            Posting as {profileDetails.grade} · {profileDetails.family}. You can
            update these in account settings.
          </p>
        )
      ) : (
        <LoadingIndicator
          label="Loading your student profile"
          className="text-foreground/55 text-xs"
        />
      )}

      <section
        aria-labelledby="cover-image-heading"
        className="border-foreground/10 grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <div>
          <h2 id="cover-image-heading" className="text-sm font-semibold">
            Project cover image{" "}
            <span className="text-foreground/60">(required)</span>
          </h2>
          <p className="text-foreground/55 mt-1 text-xs leading-relaxed">
            Add an image to publish. It appears on the project card instead of
            the small code preview.
          </p>
        </div>
        <label className="focus-ring border-foreground/10 hover:bg-foreground/5 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border px-3 text-xs font-medium">
          Choose image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void loadCoverImage(event)}
            className="sr-only"
          />
        </label>
        {coverImage ? (
          <div
            role="img"
            aria-label="Project cover image preview"
            className="border-foreground/10 relative aspect-video w-full overflow-hidden rounded-lg border bg-cover bg-center sm:col-span-2"
            style={{ backgroundImage: `url("${coverImage}")` }}
          >
            <button
              type="button"
              onClick={() => setCoverImage(null)}
              className="focus-ring bg-background/90 absolute top-2 right-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              Remove image
            </button>
          </div>
        ) : null}
      </section>

      {kind === "link" ? (
        <label className="text-sm font-medium">
          Project URL
          <input
            required
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            className={fieldClassName}
          />
        </label>
      ) : (
        <div className="grid gap-6">
          <CodeEditor
            label="HTML"
            language="html"
            accept=".html,text/html"
            value={html}
            onChange={setHtml}
            onFileChange={(event) => void loadFile(event, setHtml)}
            placeholder="Paste your HTML here, or choose an .html file."
          />
          <CodeEditor
            label="CSS"
            language="css"
            accept=".css,text/css"
            value={css}
            onChange={setCss}
            onFileChange={(event) => void loadFile(event, setCss)}
            placeholder="Paste your CSS here, or choose a .css file."
          />
          <CodeEditor
            label="JavaScript"
            language="javascript"
            accept=".js,text/javascript"
            value={js}
            onChange={setJs}
            onFileChange={(event) => void loadFile(event, setJs)}
            placeholder="Paste your JavaScript here, or choose a .js file."
          />
          <section
            aria-labelledby="additional-files-heading"
            className="grid gap-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3
                  id="additional-files-heading"
                  className="text-sm font-semibold"
                >
                  Additional files
                </h3>
                <p className="text-foreground/55 mt-1 text-xs leading-relaxed">
                  Add pages such as contact.html. Use regular links like{" "}
                  <code>href=&quot;contact.html&quot;</code>; they work in the
                  published preview.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="focus-ring border-foreground/10 hover:bg-foreground/5 inline-flex min-h-10 cursor-pointer items-center rounded-lg border px-3 text-xs font-medium">
                  Upload files
                  <input
                    type="file"
                    multiple
                    accept=".html,.css,.js,text/html,text/css,text/javascript"
                    onChange={(event) => void loadAdditionalFiles(event)}
                    className="sr-only"
                  />
                </label>
                <button
                  type="button"
                  onClick={addAdditionalFile}
                  className="focus-ring border-foreground/10 hover:bg-foreground/5 inline-flex min-h-10 items-center rounded-lg border px-3 text-xs font-medium"
                >
                  Add a file
                </button>
              </div>
            </div>

            {additionalFiles.map((file) => (
              <div
                key={file.id}
                className="border-foreground/10 grid gap-3 rounded-xl border p-3"
              >
                <div className="flex items-end gap-3">
                  <label className="min-w-0 flex-1 text-xs font-medium">
                    File name
                    <input
                      required
                      value={file.name}
                      pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,95}\\.(?:[hH][tT][mM][lL]|[cC][sS][sS]|[jJ][sS])"
                      aria-label="Additional file name"
                      onChange={(event) => {
                        const name = event.target.value;
                        setAdditionalFiles((current) =>
                          current.map((item) =>
                            item.id === file.id ? { ...item, name } : item
                          )
                        );
                      }}
                      className={fieldClassName}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setAdditionalFiles((current) =>
                        current.filter((item) => item.id !== file.id)
                      )
                    }
                    aria-label={`Remove ${file.name}`}
                    className="focus-ring hover:bg-foreground/5 mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
                <div className="project-code-editor border-foreground/10 bg-background overflow-hidden rounded-xl border">
                  <CodeMirror
                    value={file.content}
                    onChange={(nextValue) =>
                      setAdditionalFiles((current) =>
                        current.map((item) =>
                          item.id === file.id
                            ? {
                                ...item,
                                content: nextValue.slice(0, LIMITS.file),
                              }
                            : item
                        )
                      )
                    }
                    aria-label={`Source code for ${file.name}`}
                    height="180px"
                    extensions={[
                      CODE_LANGUAGES[getCodeLanguage(file.name)],
                      CODE_HIGHLIGHTING,
                      CODE_EDITOR_THEME,
                      EditorView.lineWrapping,
                    ]}
                  />
                </div>
              </div>
            ))}
            <p className="text-foreground/45 text-xs">
              Up to {LIMITS.projectFiles} files, 100 KB per file, and 1 MB
              total.
            </p>
          </section>
          <section aria-label="Live preview">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              Live preview
            </div>
            <iframe
              title="Live preview of your project"
              sandbox="allow-scripts"
              srcDoc={buildPreviewDocument(html, css, js)}
              className="border-foreground/10 h-80 w-full rounded-2xl border bg-white"
            />
          </section>
          <p className="text-foreground/55 -mt-4 text-xs leading-relaxed">
            The live preview shows index.html. Links to additional pages work in
            the published preview, where all code runs in an isolated frame.
          </p>
        </div>
      )}

      {error ? (
        <div role="alert" className="bg-foreground/5 rounded-xl p-4 text-sm">
          <p>{error}</p>
          {error === "Sign in before publishing a project." ? (
            <Link
              href="/login"
              className="mt-2 inline-flex font-medium underline underline-offset-2"
            >
              Sign in or create an account
            </Link>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || loadingEdit}
        className="focus-ring bg-foreground text-background inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 sm:justify-self-start"
      >
        {submitting ? (
          <LoadingIndicator
            label={projectId ? "Saving" : "Publishing"}
            className="text-background"
          />
        ) : projectId ? (
          "Save changes"
        ) : (
          "Publish project"
        )}
      </button>
    </form>
  );
}

function CodeEditor({
  label,
  language,
  accept,
  value,
  onChange,
  onFileChange,
  placeholder,
}: {
  label: string;
  language: CodeLanguage;
  accept: string;
  value: string;
  onChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}): ReactNode {
  return (
    <div className="block text-sm font-medium">
      <span className="flex flex-wrap items-center justify-between gap-3">
        <span>{label}</span>
        <span className="text-foreground/45 ml-auto text-xs font-normal">
          {value.length} / 100,000 characters
        </span>
        <label className="text-foreground/60 flex cursor-pointer items-center gap-2 text-xs font-normal">
          <span className="sr-only">Load a {label} file</span>
          <input
            type="file"
            accept={accept}
            onChange={onFileChange}
            className="file:bg-foreground/5 file:text-foreground max-w-full file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-xs file:font-medium"
          />
        </label>
      </span>
      <div className="project-code-editor border-foreground/10 focus-within:ring-ring/40 bg-background mt-2 overflow-hidden rounded-xl border focus-within:ring-2">
        <CodeMirror
          value={value}
          onChange={(nextValue) => onChange(nextValue.slice(0, LIMITS.file))}
          aria-label={`${label} source code`}
          height="220px"
          placeholder={placeholder}
          extensions={[
            CODE_LANGUAGES[language],
            CODE_HIGHLIGHTING,
            CODE_EDITOR_THEME,
            EditorView.lineWrapping,
          ]}
        />
      </div>
    </div>
  );
}
