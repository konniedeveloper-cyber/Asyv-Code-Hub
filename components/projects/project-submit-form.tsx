"use client";

import { buildPreviewDocument } from "@/lib/preview-document";
import { readError, readProjectId } from "@/lib/parse";
import { LIMITS } from "@/lib/limits";
import { Code2, ExternalLink, Link2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

type ProjectKind = "link" | "files";

const fieldClassName =
  "focus-ring mt-2 w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-foreground/35 focus:border-foreground/30";
const editorClassName = `${fieldClassName} min-h-40 resize-y font-mono text-xs leading-relaxed`;

export function ProjectSubmitForm(): ReactNode {
  const router = useRouter();
  const [kind, setKind] = useState<ProjectKind>("files");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [js, setJs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const draft =
      kind === "link"
        ? { kind, title, description, url }
        : { kind, title, description, html, css, js };

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = readError(data, "Could not publish your project.");
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
      router.push("/projects");
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
            accept=".html,text/html"
            value={html}
            onChange={setHtml}
            onFileChange={(event) => void loadFile(event, setHtml)}
            placeholder="Paste your HTML here, or choose an .html file."
          />
          <CodeEditor
            label="CSS"
            accept=".css,text/css"
            value={css}
            onChange={setCss}
            onFileChange={(event) => void loadFile(event, setCss)}
            placeholder="Paste your CSS here, or choose a .css file."
          />
          <CodeEditor
            label="JavaScript"
            accept=".js,text/javascript"
            value={js}
            onChange={setJs}
            onFileChange={(event) => void loadFile(event, setJs)}
            placeholder="Paste your JavaScript here, or choose a .js file."
          />
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
            Each file can be up to 100 KB. Preview code runs in an isolated
            frame.
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
        disabled={submitting}
        className="focus-ring bg-foreground text-background inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 sm:justify-self-start"
      >
        {submitting ? "Publishing…" : "Publish project"}
      </button>
    </form>
  );
}

function CodeEditor({
  label,
  accept,
  value,
  onChange,
  onFileChange,
  placeholder,
}: {
  label: string;
  accept: string;
  value: string;
  onChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}): ReactNode {
  return (
    <label className="block text-sm font-medium">
      <span className="flex flex-wrap items-center justify-between gap-3">
        <span>{label}</span>
        <input
          type="file"
          accept={accept}
          onChange={onFileChange}
          className="text-foreground/60 file:bg-foreground/5 file:text-foreground max-w-full text-xs font-normal file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-xs file:font-medium"
        />
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={LIMITS.file}
        spellCheck={false}
        placeholder={placeholder}
        className={editorClassName}
      />
    </label>
  );
}
