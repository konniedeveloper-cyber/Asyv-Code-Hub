import { clearSessionCookie } from "@/lib/session";
import { routeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  try {
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
