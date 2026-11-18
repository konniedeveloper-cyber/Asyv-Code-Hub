import { getAdminUser } from "@/lib/authorization";
import { jsonError, routeError } from "@/lib/errors";
import { deleteStudent } from "@/lib/users";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const admin = await getAdminUser();
    const { id } = await context.params;
    const result = await deleteStudent(id, admin.id);
    if (result === "not-found") return jsonError("Student not found.", 404);
    if (result === "forbidden") {
      return jsonError("Admins can only delete student accounts.", 403);
    }
    return Response.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
