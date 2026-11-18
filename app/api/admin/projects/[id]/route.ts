import { getAdminUser } from "@/lib/authorization";
import { jsonError, readJson, routeError } from "@/lib/errors";
import { isRecord } from "@/lib/parse";
import { reviewProject } from "@/lib/project-store";
import { LIMITS } from "@/lib/limits";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const admin = await getAdminUser();
    const body: unknown = await readJson(request);
    if (!isRecord(body)) return jsonError("Send a review action as JSON.", 400);
    if (body.status !== "approved" && body.status !== "rejected") {
      return jsonError("Choose approve or reject for this project.", 400);
    }
    if (
      body.reason !== undefined &&
      body.reason !== null &&
      typeof body.reason !== "string"
    ) {
      return jsonError("Review notes must be text.", 400);
    }

    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length > LIMITS.reviewReason) {
      return jsonError(
        `Review notes must be ${LIMITS.reviewReason} characters or fewer.`,
        400
      );
    }

    const { id } = await context.params;
    const result = await reviewProject(
      id,
      admin.id,
      body.status,
      reason || null
    );
    if (result === null) return jsonError("Project not found.", 404);
    if (result === "not-pending") {
      return jsonError("This project is no longer awaiting review.", 409);
    }
    return Response.json({ ok: true, status: body.status });
  } catch (error) {
    return routeError(error);
  }
}
