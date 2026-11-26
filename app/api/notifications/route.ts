import { getCurrentUser } from "@/lib/users";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
} from "@/lib/notifications";
import { jsonError, readJson, routeError } from "@/lib/errors";
import { isRecord } from "@/lib/parse";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Sign in to view notifications.", 401);

    const unreadCount = await countUnreadNotifications(user.id);
    if (new URL(request.url).searchParams.get("summary") === "1") {
      return Response.json({ unreadCount });
    }

    const notifications = await listNotifications(user.id);
    return Response.json({ notifications, unreadCount });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Sign in to update notifications.", 401);

    const body: unknown = await readJson(request);
    if (!isRecord(body) || body.markAllRead !== true) {
      return jsonError(
        "Send a request to mark all notifications as read.",
        400
      );
    }

    await markAllNotificationsRead(user.id);
    return Response.json({ ok: true, unreadCount: 0 });
  } catch (error) {
    return routeError(error);
  }
}
