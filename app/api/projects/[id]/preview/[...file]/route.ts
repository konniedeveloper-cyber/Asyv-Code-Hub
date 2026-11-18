import { publicError } from "@/lib/errors";
import { buildPreviewDocumentFromFiles } from "@/lib/preview-document";
import { getProjectFiles } from "@/lib/project-store";
import { getCurrentUser } from "@/lib/users";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; file: string[] }>;
};

const PREVIEW_HEADERS = {
  "Content-Security-Policy":
    "sandbox allow-scripts; default-src 'none'; style-src 'unsafe-inline' 'self' https: http:; script-src 'unsafe-inline' 'self' https: http:; img-src data: blob: https: http:; font-src data: https: http:; media-src data: blob: https: http:;",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
};

function notFound(): Response {
  return new Response("Preview file not found.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const { id, file: path } = await context.params;
    if (path.length !== 1) return notFound();
    const filename = path[0];
    if (!filename) return notFound();

    const viewer = await getCurrentUser();
    const files = await getProjectFiles(id, viewer);
    if (!files) return notFound();

    const requested = files.find(
      (entry) => entry.name.toLowerCase() === filename.toLowerCase()
    );
    if (!requested) return notFound();

    const extension = requested.name.split(".").pop()?.toLowerCase();
    const baseHref = new URL(
      `/api/projects/${id}/preview/`,
      request.url
    ).toString();
    if (extension === "html") {
      const documentHtml = buildPreviewDocumentFromFiles(
        files,
        requested.name,
        baseHref
      );
      if (!documentHtml) return notFound();
      return new Response(documentHtml, {
        headers: {
          ...PREVIEW_HEADERS,
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    if (extension === "css") {
      return new Response(requested.content, {
        headers: {
          ...PREVIEW_HEADERS,
          "Content-Type": "text/css; charset=utf-8",
        },
      });
    }
    if (extension === "js") {
      return new Response(requested.content, {
        headers: {
          ...PREVIEW_HEADERS,
          "Content-Type": "text/javascript; charset=utf-8",
        },
      });
    }

    return notFound();
  } catch (error) {
    const message = publicError(error) ?? "Could not load the preview file.";
    return new Response(message, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
