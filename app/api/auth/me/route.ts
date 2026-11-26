import { jsonError, readJson, routeError } from "@/lib/errors";
import { getCurrentUser, updateUserProfile } from "@/lib/users";
import { isRecord, isStudentFamily, isStudentGrade } from "@/lib/parse";

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
    if (!isRecord(body)) return jsonError("Send profile details as JSON.", 400);

    const update: {
      profileImage?: string | null;
      family?: typeof user.family | null;
      grade?: typeof user.grade | null;
    } = {};
    if ("profileImage" in body) {
      const profileImage = body.profileImage;
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
      update.profileImage = profileImage;
    }
    if ("family" in body) {
      if (body.family !== null && !isStudentFamily(body.family)) {
        return jsonError("Choose one of the listed student families.", 400);
      }
      update.family = body.family;
    }
    if ("grade" in body) {
      if (body.grade !== null && !isStudentGrade(body.grade)) {
        return jsonError("Choose one of the listed school grades.", 400);
      }
      update.grade = body.grade;
    }
    if (Object.keys(update).length === 0)
      return jsonError("Send profile details to update.", 400);

    const updated = await updateUserProfile(user.id, update);
    if (!updated) return jsonError("Could not update your profile.", 404);
    return Response.json({ user: updated });
  } catch (error) {
    return routeError(error);
  }
}
