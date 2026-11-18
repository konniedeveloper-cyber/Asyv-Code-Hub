import { jsonError, routeError } from "@/lib/errors";
import { toggleLike } from "@/lib/project-store";
import { getCurrentUser } from "@/lib/users";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Sign in to like a project.", 401);

    const { id } = await context.params;
    const result = await toggleLike(user.id, id);
    if (!result) return jsonError("That project was not found.", 404);

    return Response.json(result);
  } catch (error) {
    return routeError(error);
  }
}
