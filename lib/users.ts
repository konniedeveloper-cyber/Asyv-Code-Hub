import { ObjectId } from "mongodb";
import { compare, hash } from "bcryptjs";

import { AuthError } from "@/lib/errors";
import { getDb, isDuplicateKey } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import type { PublicUser } from "@/lib/types";

const USERS = "users";

type UserDoc = {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

function toPublic(user: UserDoc): PublicUser {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
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
    });

    return {
      id: result.insertedId.toHexString(),
      name: input.name,
      email: input.email,
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
