import { jsonError, routeError } from "@/lib/errors";
import { deleteProject } from "@/lib/project-store";
import { getCurrentUser } from "@/lib/users";

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
