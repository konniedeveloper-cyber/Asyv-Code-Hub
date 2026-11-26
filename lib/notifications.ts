import { ObjectId } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type { NotificationType, UserNotification } from "@/lib/types";

const NOTIFICATIONS = "notifications";

type NotificationDoc = {
  _id: ObjectId;
  userId: ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  readAt: Date | null;
  createdAt: Date;
};

function toObjectId(id: string): ObjectId | null {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  return new ObjectId(id);
}

function toNotification(doc: NotificationDoc): UserNotification {
  return {
    id: doc._id.toHexString(),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    href: doc.href,
    read: doc.readAt !== null,
    createdAt: doc.createdAt.toISOString(),
  };
}

async function createNotification(
  userId: string,
  notification: Pick<NotificationDoc, "type" | "title" | "message" | "href">
): Promise<ObjectId> {
  const recipientId = toObjectId(userId);
  if (!recipientId) throw new Error("Cannot notify an invalid user.");

  const doc: NotificationDoc = {
    _id: new ObjectId(),
    userId: recipientId,
    ...notification,
    readAt: null,
    createdAt: new Date(),
  };
  await (await getDb())
    .collection<NotificationDoc>(NOTIFICATIONS)
    .insertOne(doc);
  return doc._id;
}

export async function createProjectReviewNotification(
  userId: string,
  projectTitle: string,
  status: "approved" | "rejected",
  reviewReason: string | null
): Promise<ObjectId> {
  return createNotification(userId, {
    type: status === "approved" ? "project-approved" : "project-rejected",
    title:
      status === "approved"
        ? `Project approved: ${projectTitle}`
        : `Project needs changes: ${projectTitle}`,
    message:
      status === "approved"
        ? "Your project is approved and is now visible in the community."
        : reviewReason?.trim()
          ? `Admin feedback: ${reviewReason.trim()}`
          : "An administrator requested changes before approval. Update your project and resubmit it.",
    href: "/my-projects",
  });
}

export async function createProjectDeletedNotification(
  userId: string,
  projectTitle: string
): Promise<ObjectId> {
  return createNotification(userId, {
    type: "project-deleted",
    title: `Project removed: ${projectTitle}`,
    message:
      "An administrator removed this project. Contact the hub team if you think this was a mistake.",
    href: "/my-projects",
  });
}

export async function removeNotification(id: ObjectId): Promise<void> {
  await (await getDb())
    .collection<NotificationDoc>(NOTIFICATIONS)
    .deleteOne({ _id: id });
}

export async function listNotifications(
  userId: string
): Promise<UserNotification[]> {
  const recipientId = toObjectId(userId);
  if (!recipientId) return [];

  const docs = await (await getDb())
    .collection<NotificationDoc>(NOTIFICATIONS)
    .find({ userId: recipientId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return docs.map(toNotification);
}

export async function countUnreadNotifications(
  userId: string
): Promise<number> {
  const recipientId = toObjectId(userId);
  if (!recipientId) return 0;

  return (await getDb())
    .collection<NotificationDoc>(NOTIFICATIONS)
    .countDocuments({ userId: recipientId, readAt: null });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const recipientId = toObjectId(userId);
  if (!recipientId)
    throw new Error("Cannot mark notifications for invalid user.");

  await (await getDb())
    .collection<NotificationDoc>(NOTIFICATIONS)
    .updateMany(
      { userId: recipientId, readAt: null },
      { $set: { readAt: new Date() } }
    );
}
