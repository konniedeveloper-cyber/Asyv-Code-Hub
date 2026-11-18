import { jsonError, readJson, routeError } from "@/lib/errors";
import { parseCredentials } from "@/lib/parse";
import { setSessionCookie } from "@/lib/session";
import { registerUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const parsed = parseCredentials(await readJson(request), "register");
  if (!parsed.ok) return jsonError(parsed.error, 400);
  if (parsed.value.mode !== "register") {
    return jsonError("Enter your name.", 400);
  }

  try {
    const user = await registerUser(parsed.value);
    await setSessionCookie(user.id);
    return Response.json({ user });
  } catch (error) {
    return routeError(error);
  }
}
