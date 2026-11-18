import { jsonError, readJson, routeError } from "@/lib/errors";
import { parseProjectDraft } from "@/lib/parse";
import { createProject, listProjects } from "@/lib/project-store";
import { getCurrentUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    const projects = await listProjects(user?.id ?? null);
    return Response.json({ projects });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Sign in to post a project.", 401);

    const parsed = parseProjectDraft(await readJson(request));
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const project = await createProject(user, parsed.draft);
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
