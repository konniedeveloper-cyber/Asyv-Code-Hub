import { AuthError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/users";
import type { PublicUser } from "@/lib/types";

export async function getAdminUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sign in to access admin controls.", 401);
  if (user.role !== "admin") {
    throw new AuthError("Admin access is required.", 403);
  }
  return user;
}
