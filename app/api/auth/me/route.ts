import { jsonError, readJson, routeError } from "@/lib/errors";
import { getCurrentUser, updateProfileImage } from "@/lib/users";
import { isRecord } from "@/lib/parse";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    return Response.json({ user });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Sign in to update your profile.", 401);

    const body = await readJson(request);
    if (!isRecord(body)) return jsonError("Send a profile image as JSON.", 400);

    const profileImage = body.profileImage === null ? null : body.profileImage;
    if (
      profileImage !== null &&
      (typeof profileImage !== "string" ||
        !/^data:image\/(png|jpeg|webp);base64,/i.test(profileImage))
    ) {
      return jsonError("Choose a PNG, JPEG, or WebP profile image.", 400);
    }
    if (typeof profileImage === "string" && profileImage.length > 350_000) {
      return jsonError("Profile image must be 250 KB or smaller.", 400);
    }

    const updated = await updateProfileImage(user.id, profileImage);
    if (!updated) return jsonError("Could not update your profile.", 404);
    return Response.json({ user: updated });
  } catch (error) {
    return routeError(error);
  }
}
