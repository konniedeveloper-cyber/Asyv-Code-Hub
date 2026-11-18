import { jsonError, routeError } from "@/lib/errors";
import { listMyProjects } from "@/lib/project-store";
import { getCurrentUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Sign in to view your projects.", 401);

    const projects = await listMyProjects(user.id);
    return Response.json({ projects });
  } catch (error) {
    return routeError(error);
  }
}
