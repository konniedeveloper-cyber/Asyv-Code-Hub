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
import { readError, readProjectId } from "@/lib/parse";
import { LIMITS } from "@/lib/limits";
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
    { tag: tags.keyword, color: "#c792ea" },
    { tag: tags.string, color: "#a5d6a7" },
    { tag: tags.number, color: "#f78c6c" },
    { tag: tags.bool, color: "#f78c6c" },
    { tag: tags.null, color: "#f78c6c" },
    { tag: tags.comment, color: "#7f9f9f" },
    { tag: tags.propertyName, color: "#82aaff" },
    { tag: tags.attributeName, color: "#ffcb6b" },
    { tag: tags.attributeValue, color: "#a5d6a7" },
    { tag: tags.tagName, color: "#f07178" },
    { tag: tags.function(tags.variableName), color: "#82aaff" },
    { tag: tags.definition(tags.variableName), color: "#89ddff" },
    { tag: tags.typeName, color: "#ffcb6b" },
    { tag: tags.operator, color: "#89ddff" },
    { tag: tags.punctuation, color: "#cbd5e1" },
    { tag: tags.meta, color: "#c792ea" },
  ])
);

const CODE_EDITOR_THEME = EditorView.theme({
  "&": {
    backgroundColor: "#171717",
    color: "#e5e7eb",
    fontSize: "13px",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
    lineHeight: "1.65",
  },
  ".cm-content": {
    minHeight: "9rem",
    padding: "0.8rem 0",
    caretColor: "#f8fafc",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "#737373",
    borderRight: "1px solid #303030",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "#e5e7eb",
  },
  ".cm-cursor": {
    borderLeftColor: "#f8fafc",
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(96, 165, 250, 0.28)",
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
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [js, setJs] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<AdditionalFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(projectId !== null);

  useEffect(() => {
    if (!projectId) return;
    let active = true;

    fetch(`/api/projects/${encodeURIComponent(projectId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(
            readError(data, "Could not load the project for editing.")
          );
          return;
        }
        if (
          typeof data !== "object" ||
          data === null ||
          !("project" in data)
        ) {
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
          !("coverImage" in project)
        ) {
          setError("The project returned an unexpected response.");
          return;
        }

        setKind(project.kind === "link" ? "link" : "files");
        setTitle(typeof project.title === "string" ? project.title : "");
        setDescription(
          typeof project.description === "string" ? project.description : ""
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
    setSubmitting(true);
    setError(null);
    const draft =
      kind === "link"
        ? { kind, title, description, url, coverImage }
        : {
            kind,
            title,
            description,
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
      const response = await fetch(
        projectId ? `/api/projects/${encodeURIComponent(projectId)}` : "/api/projects",
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
          projectId ? "Could not save your project." : "Could not publish your project."
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
        <p role="status" className="text-foreground/60 rounded-xl border border-foreground/10 p-5 text-sm">
          Loading project for editing…
        </p>
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
        Description
        <textarea
          required
          minLength={2}
          maxLength={LIMITS.description}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What does your project do?"
          rows={3}
          className={`${fieldClassName} resize-y`}
        />
      </label>

      <section
        aria-labelledby="cover-image-heading"
        className="border-foreground/10 grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <div>
          <h2 id="cover-image-heading" className="text-sm font-semibold">
            Project cover image{" "}
            <span className="text-foreground/45">(optional)</span>
          </h2>
          <p className="text-foreground/55 mt-1 text-xs leading-relaxed">
            This image appears on the project card instead of the small code
            preview.
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
                <div className="border-foreground/10 overflow-hidden rounded-xl border bg-[#171717]">
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
        {submitting
          ? projectId
            ? "Saving…"
            : "Publishing…"
          : projectId
            ? "Save changes"
            : "Publish project"}
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
      <div className="border-foreground/10 focus-within:ring-ring/40 mt-2 overflow-hidden rounded-xl border bg-[#171717] focus-within:ring-2">
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
