import { ObjectId } from "mongodb";
import { compare, hash } from "bcryptjs";

import { AuthError } from "@/lib/errors";
import { getDb, isDuplicateKey } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import type { AdminStudent, PublicUser, UserRole } from "@/lib/types";

const USERS = "users";

type UserDoc = {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  role?: UserRole;
  profileImage?: string | null;
};

function toPublic(user: UserDoc): PublicUser {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    role: user.role === "admin" ? "admin" : "student",
    profileImage: user.profileImage ?? null,
  };
}

function toObjectId(id: string): ObjectId | null {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  return new ObjectId(id);
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<PublicUser> {
  const db = await getDb();
  const passwordHash = await hash(input.password, 12);

  try {
    const result = await db.collection<UserDoc>(USERS).insertOne({
      _id: new ObjectId(),
      name: input.name,
      email: input.email,
      passwordHash,
      createdAt: new Date(),
      role: "student",
    });

    return {
      id: result.insertedId.toHexString(),
      name: input.name,
      email: input.email,
      role: "student",
      profileImage: null,
    };
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new AuthError("An account with that email already exists.", 409);
    }
    throw error;
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<PublicUser> {
  const db = await getDb();
  const user = await db.collection<UserDoc>(USERS).findOne({ email });

  if (!user || !(await compare(password, user.passwordHash))) {
    throw new AuthError("Email or password is incorrect.", 401);
  }

  return toPublic(user);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const userId = await getSessionUserId();
  const objectId = userId ? toObjectId(userId) : null;
  if (!objectId) return null;

  const db = await getDb();
  const user = await db.collection<UserDoc>(USERS).findOne({ _id: objectId });
  return user ? toPublic(user) : null;
}

export async function updateProfileImage(
  userId: string,
  profileImage: string | null
): Promise<PublicUser | null> {
  const objectId = toObjectId(userId);
  if (!objectId) return null;

  const db = await getDb();
  const result = await db
    .collection<UserDoc>(USERS)
    .findOneAndUpdate(
      { _id: objectId },
      { $set: { profileImage } },
      { returnDocument: "after" }
    );
  return result ? toPublic(result) : null;
}

export async function listStudents(): Promise<AdminStudent[]> {
  const db = await getDb();
  const students = await db
    .collection<UserDoc>(USERS)
    .find(
      { role: { $ne: "admin" } },
      { projection: { _id: 1, name: 1, email: 1, createdAt: 1, role: 1 } }
    )
    .sort({ createdAt: -1 })
    .toArray();

  return students.map((student) => ({
    id: student._id.toHexString(),
    name: student.name,
    email: student.email,
    createdAt: student.createdAt.toISOString(),
  }));
}

export async function deleteStudent(
  studentId: string,
  adminId: string
): Promise<"deleted" | "not-found" | "forbidden"> {
  const studentObjectId = toObjectId(studentId);
  const adminObjectId = toObjectId(adminId);
  if (
    !studentObjectId ||
    !adminObjectId ||
    studentObjectId.equals(adminObjectId)
  ) {
    return "forbidden";
  }

  const db = await getDb();
  const users = db.collection<UserDoc>(USERS);
  const student = await users.findOne(
    { _id: studentObjectId },
    { projection: { role: 1 } }
  );
  if (!student) return "not-found";
  if (student.role === "admin") return "forbidden";

  const projects = db.collection("projects");
  const authoredProjects = await projects
    .find({ authorId: studentObjectId }, { projection: { _id: 1 } })
    .toArray();
  const projectIds = authoredProjects.map((project) => project._id);

  await db.collection("likes").deleteMany({
    $or: [{ userId: studentObjectId }, { projectId: { $in: projectIds } }],
  });
  await projects.deleteMany({ authorId: studentObjectId });

  const result = await users.deleteOne({
    _id: studentObjectId,
    role: { $ne: "admin" },
  });
  return result.deletedCount === 1 ? "deleted" : "forbidden";
}
