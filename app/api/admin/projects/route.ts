import { getAdminUser } from "@/lib/authorization";
import { routeError } from "@/lib/errors";
import { listAdminProjects } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    await getAdminUser();
    const projects = await listAdminProjects();
    return Response.json({ projects });
  } catch (error) {
    return routeError(error);
  }
}
