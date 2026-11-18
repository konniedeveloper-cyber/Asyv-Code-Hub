import { buildPreviewDocument } from "@/lib/preview-document";
import { getProjectFiles } from "@/lib/project-store";
import { publicError } from "@/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const PREVIEW_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob: https: http:; font-src data: https:; media-src data: blob: https: http:;",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
};

export async function GET(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const { id } = await context.params;
    const files = await getProjectFiles(id);
    if (!files) {
      return new Response("Preview not found.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return new Response(buildPreviewDocument(files.html, files.css, files.js), {
      headers: PREVIEW_HEADERS,
    });
  } catch (error) {
    const message = publicError(error) ?? "Could not build the preview.";
    return new Response(message, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
