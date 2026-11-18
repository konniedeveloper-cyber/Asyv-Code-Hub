import { ObjectId } from "mongodb";

import { isDuplicateKey, getDb } from "@/lib/mongodb";
import type {
  ProjectCard,
  ProjectDetail,
  ProjectDraft,
  ProjectManagementItem,
  ProjectSourceFile,
  PublicUser,
  ProjectStatus,
} from "@/lib/types";

const PROJECTS = "projects";
const LIKES = "likes";

type ProjectDoc = {
  _id: ObjectId;
  authorId: ObjectId;
  authorName: string;
  title: string;
  description: string;
  kind: "link" | "files";
  url: string | null;
  coverImage?: string | null;
  html: string | null;
  css: string | null;
  js: string | null;
  files?: ProjectSourceFile[] | null;
  status?: ProjectStatus;
  reviewReason?: string | null;
  reviewedAt?: Date | null;
  reviewedBy?: ObjectId | null;
  createdAt: Date;
};

type LikeDoc = {
  _id: ObjectId;
  userId: ObjectId;
  projectId: ObjectId;
  createdAt: Date;
};

function toObjectId(id: string): ObjectId | null {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  return new ObjectId(id);
}

function toCard(
  doc: ProjectDoc,
  likeCount: number,
  likedByMe: boolean
): ProjectCard {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    description: doc.description,
    kind: doc.kind,
    url: doc.url,
    coverImage: doc.coverImage ?? null,
    authorName: doc.authorName,
    likeCount,
    likedByMe,
    createdAt: doc.createdAt.toISOString(),
  };
}

function toDetail(
  doc: ProjectDoc,
  likeCount: number,
  likedByMe: boolean
): ProjectDetail {
  return {
    ...toCard(doc, likeCount, likedByMe),
    url: doc.url,
  };
}

function toManagementItem(doc: ProjectDoc): ProjectManagementItem {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    description: doc.description,
    kind: doc.kind,
    url: doc.url,
    coverImage: doc.coverImage ?? null,
    authorName: doc.authorName,
    status: doc.status ?? "approved",
    reviewReason: doc.reviewReason ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listProjects(
  viewerId: string | null
): Promise<ProjectCard[]> {
  const db = await getDb();
  const docs = await db
    .collection<ProjectDoc>(PROJECTS)
    .find(
      { $or: [{ status: "approved" }, { status: { $exists: false } }] },
      {
        projection: {
          _id: 1,
          title: 1,
          description: 1,
          kind: 1,
          url: 1,
          coverImage: 1,
          authorName: 1,
          createdAt: 1,
        },
      }
    )
    .sort({ createdAt: -1 })
    .limit(60)
    .toArray();

  if (docs.length === 0) return [];

  const ids = docs.map((doc) => doc._id);
  const likes = await db
    .collection<LikeDoc>(LIKES)
    .find({ projectId: { $in: ids } })
    .toArray();

  const counts = new Map<string, number>();
  const liked = new Set<string>();
  const viewer = viewerId ? toObjectId(viewerId) : null;

  for (const like of likes) {
    const key = like.projectId.toHexString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (viewer && like.userId.equals(viewer)) liked.add(key);
  }

  return docs.map((doc) => {
    const key = doc._id.toHexString();
    return toCard(doc, counts.get(key) ?? 0, liked.has(key));
  });
}

export async function listMyProjects(
  userId: string
): Promise<ProjectManagementItem[]> {
  const authorId = toObjectId(userId);
  if (!authorId) return [];

  const db = await getDb();
  const docs = await db
    .collection<ProjectDoc>(PROJECTS)
    .find(
      { authorId },
      {
        projection: {
          _id: 1,
          title: 1,
          description: 1,
          kind: 1,
          url: 1,
          coverImage: 1,
          authorName: 1,
          status: 1,
          reviewReason: 1,
          createdAt: 1,
        },
      }
    )
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toManagementItem);
}

export async function listAdminProjects(): Promise<ProjectManagementItem[]> {
  const db = await getDb();
  const docs = await db
    .collection<ProjectDoc>(PROJECTS)
    .find(
      {},
      {
        projection: {
          _id: 1,
          title: 1,
          description: 1,
          kind: 1,
          url: 1,
          coverImage: 1,
          authorName: 1,
          status: 1,
          reviewReason: 1,
          createdAt: 1,
        },
      }
    )
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toManagementItem);
}

export async function getProject(
  id: string,
  viewerId: string | null
): Promise<ProjectDetail | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const db = await getDb();
  const doc = await db
    .collection<ProjectDoc>(PROJECTS)
    .findOne({ _id: objectId });
  if (!doc) return null;

  const likes = db.collection<LikeDoc>(LIKES);
  const likeCount = await likes.countDocuments({ projectId: objectId });
  const viewer = viewerId ? toObjectId(viewerId) : null;
  const likedByMe = viewer
    ? (await likes.findOne({ projectId: objectId, userId: viewer })) !== null
    : false;

  return toDetail(doc, likeCount, likedByMe);
}

export async function createProject(
  author: PublicUser,
  draft: ProjectDraft
): Promise<ProjectDetail> {
  const db = await getDb();
  const doc: ProjectDoc = {
    _id: new ObjectId(),
    authorId: new ObjectId(author.id),
    authorName: author.name,
    title: draft.title,
    description: draft.description,
    kind: draft.kind,
    url: draft.kind === "link" ? draft.url : null,
    coverImage: draft.coverImage,
    html: null,
    css: null,
    js: null,
    files: draft.kind === "files" ? draft.files : null,
    status: "pending",
    reviewReason: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: new Date(),
  };

  await db.collection<ProjectDoc>(PROJECTS).insertOne(doc);
  return toDetail(doc, 0, false);
}

export async function getProjectFiles(
  id: string,
  viewer: Pick<PublicUser, "id" | "role"> | null
): Promise<ProjectSourceFile[] | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const db = await getDb();
  const doc = await db.collection<ProjectDoc>(PROJECTS).findOne(
    { _id: objectId },
    {
      projection: {
        _id: 1,
        authorId: 1,
        kind: 1,
        status: 1,
        files: 1,
        html: 1,
        css: 1,
        js: 1,
      },
    }
  );
  if (!doc || doc.kind !== "files") return null;
  const viewerId = viewer ? toObjectId(viewer.id) : null;
  const isOwner = viewerId !== null && doc.authorId.equals(viewerId);
  if (
    (doc.status ?? "approved") !== "approved" &&
    viewer?.role !== "admin" &&
    !isOwner
  ) {
    return null;
  }

  if (doc.files?.length) return doc.files;

  return [
    { name: "index.html", content: doc.html ?? "" },
    { name: "style.css", content: doc.css ?? "" },
    { name: "script.js", content: doc.js ?? "" },
  ];
}

export async function reviewProject(
  id: string,
  reviewerId: string,
  status: "approved" | "rejected",
  reason: string | null
): Promise<"updated" | "not-pending" | null> {
  const projectId = toObjectId(id);
  const adminId = toObjectId(reviewerId);
  if (!projectId || !adminId) return null;

  const db = await getDb();
  const result = await db.collection<ProjectDoc>(PROJECTS).updateOne(
    { _id: projectId, status: "pending" },
    {
      $set: {
        status,
        reviewReason: status === "rejected" ? reason : null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    }
  );
  if (result.matchedCount === 1) return "updated";

  const existing = await db
    .collection<ProjectDoc>(PROJECTS)
    .findOne({ _id: projectId }, { projection: { _id: 1 } });
  return existing ? "not-pending" : null;
}

export async function deleteProject(
  id: string,
  actor: Pick<PublicUser, "id" | "role">
): Promise<boolean> {
  const projectId = toObjectId(id);
  const actorId = toObjectId(actor.id);
  if (!projectId || !actorId) return false;

  const filter =
    actor.role === "admin"
      ? { _id: projectId }
      : { _id: projectId, authorId: actorId };
  const db = await getDb();
  const result = await db.collection<ProjectDoc>(PROJECTS).deleteOne(filter);
  if (result.deletedCount === 0) return false;

  await db.collection<LikeDoc>(LIKES).deleteMany({ projectId });
  return true;
}

export async function toggleLike(
  userId: string,
  projectId: string
): Promise<{ liked: boolean; likeCount: number } | null> {
  const userObjectId = toObjectId(userId);
  const projectObjectId = toObjectId(projectId);
  if (!userObjectId || !projectObjectId) return null;

  const db = await getDb();
  const project = await db.collection<ProjectDoc>(PROJECTS).findOne(
    {
      _id: projectObjectId,
      $or: [{ status: "approved" }, { status: { $exists: false } }],
    },
    { projection: { _id: 1 } }
  );
  if (!project) return null;

  const likes = db.collection<LikeDoc>(LIKES);
  const existing = await likes.findOne({
    userId: userObjectId,
    projectId: projectObjectId,
  });

  if (existing) {
    await likes.deleteOne({ _id: existing._id });
  } else {
    try {
      await likes.insertOne({
        _id: new ObjectId(),
        userId: userObjectId,
        projectId: projectObjectId,
        createdAt: new Date(),
      });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }

  const likeCount = await likes.countDocuments({ projectId: projectObjectId });
  const liked =
    (await likes.findOne({
      userId: userObjectId,
      projectId: projectObjectId,
    })) !== null;

  return { liked, likeCount };
}
