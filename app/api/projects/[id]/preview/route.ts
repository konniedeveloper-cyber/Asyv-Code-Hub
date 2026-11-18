import { buildPreviewDocumentFromFiles } from "@/lib/preview-document";
import { getProjectFiles } from "@/lib/project-store";
import { publicError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/users";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const PREVIEW_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy":
    "sandbox allow-scripts; default-src 'none'; style-src 'unsafe-inline' 'self' https: http:; script-src 'unsafe-inline' 'self' https: http:; img-src data: blob: https: http:; font-src data: https: http:; media-src data: blob: https: http:;",
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
    const viewer = await getCurrentUser();
    const files = await getProjectFiles(id, viewer);
    if (!files) {
      return new Response("Preview not found.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const baseHref = new URL(
      `/api/projects/${id}/preview/`,
      _request.url
    ).toString();
    const documentHtml = buildPreviewDocumentFromFiles(
      files,
      "index.html",
      baseHref
    );
    if (!documentHtml) {
      return new Response("Preview entry file not found.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return new Response(documentHtml, { headers: PREVIEW_HEADERS });
  } catch (error) {
    const message = publicError(error) ?? "Could not build the preview.";
    return new Response(message, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
