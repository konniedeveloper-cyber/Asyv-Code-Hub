import { ObjectId } from "mongodb";

import { isDuplicateKey, getDb } from "@/lib/mongodb";
import type {
  ProjectCard,
  ProjectDetail,
  ProjectDraft,
  PublicUser,
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
  html: string | null;
  css: string | null;
  js: string | null;
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

export async function listProjects(
  viewerId: string | null
): Promise<ProjectCard[]> {
  const db = await getDb();
  const docs = await db
    .collection<ProjectDoc>(PROJECTS)
    .find({})
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
    html: draft.kind === "files" ? draft.html : null,
    css: draft.kind === "files" ? draft.css : null,
    js: draft.kind === "files" ? draft.js : null,
    createdAt: new Date(),
  };

  await db.collection<ProjectDoc>(PROJECTS).insertOne(doc);
  return toDetail(doc, 0, false);
}

export async function getProjectFiles(
  id: string
): Promise<{ html: string; css: string; js: string } | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const db = await getDb();
  const doc = await db
    .collection<ProjectDoc>(PROJECTS)
    .findOne({ _id: objectId });
  if (!doc || doc.kind !== "files") return null;

  return {
    html: doc.html ?? "",
    css: doc.css ?? "",
    js: doc.js ?? "",
  };
}

export async function toggleLike(
  userId: string,
  projectId: string
): Promise<{ liked: boolean; likeCount: number } | null> {
  const userObjectId = toObjectId(userId);
  const projectObjectId = toObjectId(projectId);
  if (!userObjectId || !projectObjectId) return null;

  const db = await getDb();
  const project = await db
    .collection<ProjectDoc>(PROJECTS)
    .findOne({ _id: projectObjectId }, { projection: { _id: 1 } });
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
