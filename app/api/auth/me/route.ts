import { routeError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    return Response.json({ user });
  } catch (error) {
    return routeError(error);
  }
}
