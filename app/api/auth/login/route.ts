import { jsonError, readJson, routeError } from "@/lib/errors";
import { parseCredentials } from "@/lib/parse";
import { setSessionCookie } from "@/lib/session";
import { loginUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const parsed = parseCredentials(await readJson(request), "login");
  if (!parsed.ok) return jsonError(parsed.error, 400);

  try {
    const user = await loginUser(parsed.value.email, parsed.value.password);
    await setSessionCookie(user.id);
    return Response.json({ user });
  } catch (error) {
    return routeError(error);
  }
}
