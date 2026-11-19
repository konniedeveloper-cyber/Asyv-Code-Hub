import { jsonError, readJson, routeError } from "@/lib/errors";
import { deleteProject, getEditableProject, updateProject } from "@/lib/project-store";
import { getCurrentUser } from "@/lib/users";
import { parseProjectDraft } from "@/lib/parse";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Sign in to delete projects.", 401);

    const { id } = await context.params;
    const deleted = await deleteProject(id, user);
    if (!deleted)
      return jsonError("Project not found or not yours to delete.", 404);

    return Response.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}

export async function GET(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Sign in to edit projects.", 401);

    const { id } = await context.params;
    const project = await getEditableProject(id, user);
    if (!project)
      return jsonError("Project not found or not yours to edit.", 404);

    return Response.json({ project });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Sign in to edit projects.", 401);

    const parsed = parseProjectDraft(await readJson(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const { id } = await context.params;
    const project = await updateProject(id, user, parsed.draft);
    if (!project)
      return jsonError("Project not found or not yours to edit.", 404);

    return Response.json({ project });
  } catch (error) {
    return routeError(error);
  }
}
