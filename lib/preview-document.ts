import type { ProjectSourceFile } from "@/lib/types";

function neutralizeStyle(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

function neutralizeScript(js: string): string {
  return js.replace(/<\/script/gi, "<\\/script");
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function referencesFile(
  html: string,
  attribute: "href" | "src",
  file: string
): boolean {
  const escapedFile = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `\\b${attribute}\\s*=\\s*(?:"[^"]*${escapedFile}(?:[?#][^"]*)?"|'[^']*${escapedFile}(?:[?#][^']*)?')`,
    "i"
  ).test(html);
}

function addHeadContent(html: string, content: string): string {
  if (!content) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${content}`);
  }
  const htmlTag = /<html\b[^>]*>/i;
  if (htmlTag.test(html)) {
    return html.replace(htmlTag, (match) => `${match}<head>${content}</head>`);
  }
  return `<!DOCTYPE html><html><head>${content}</head><body>${html}</body></html>`;
}

export function buildPreviewDocument(
  html: string,
  css: string,
  js: string,
  baseHref?: string
): string {
  const trimmed = html.trim();
  const isDocument = /<\s*(!doctype|html|head|body)\b/i.test(trimmed);
  const documentHtml = isDocument
    ? trimmed
    : `<!DOCTYPE html><html><head></head><body>${trimmed}</body></html>`;

  const baseTag = baseHref ? `<base href="${escapeAttribute(baseHref)}">` : "";
  const styleTag =
    css.trim() && !referencesFile(documentHtml, "href", "style.css")
      ? `<style>${neutralizeStyle(css)}</style>`
      : "";
  let result = addHeadContent(documentHtml, `${baseTag}${styleTag}`);

  if (js.trim() && !referencesFile(result, "src", "script.js")) {
    const scriptTag = `<script>${neutralizeScript(js)}</script>`;
    if (/<\/body>/i.test(result)) {
      result = result.replace(/<\/body>/i, `${scriptTag}</body>`);
    } else {
      result = `${result}${scriptTag}`;
    }
  }

  return result;
}

export function buildPreviewDocumentFromFiles(
  files: ProjectSourceFile[],
  entryName = "index.html",
  baseHref?: string
): string | null {
  const entry = files.find(
    (file) => file.name.toLowerCase() === entryName.toLowerCase()
  );
  if (!entry) return null;

  const css = files.find((file) => file.name.toLowerCase() === "style.css");
  const js = files.find((file) => file.name.toLowerCase() === "script.js");
  return buildPreviewDocument(
    entry.content,
    css?.content ?? "",
    js?.content ?? "",
    baseHref
  );
}
