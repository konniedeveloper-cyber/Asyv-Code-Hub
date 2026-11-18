import { getAdminUser } from "@/lib/authorization";
import { routeError } from "@/lib/errors";
import { listStudents } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    await getAdminUser();
    const users = await listStudents();
    return Response.json({ users });
  } catch (error) {
    return routeError(error);
  }
}
