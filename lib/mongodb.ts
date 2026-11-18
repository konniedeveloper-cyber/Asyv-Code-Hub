import { MongoClient, MongoServerError, type Db } from "mongodb";

const globalStore = globalThis as typeof globalThis & {
  __asyvMongo?: {
    client: MongoClient;
    indexes: Promise<void>;
  };
};

let connecting: Promise<Db> | null = null;

async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("projects").createIndex({ createdAt: -1 }),
    db.collection("projects").createIndex({ authorId: 1, createdAt: -1 }),
    db.collection("projects").createIndex({ status: 1, createdAt: -1 }),
    db.collection("likes").createIndex({ projectId: 1 }),
    db
      .collection("likes")
      .createIndex({ userId: 1, projectId: 1 }, { unique: true }),
  ]);
}

async function connect(uri: string): Promise<Db> {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
  } catch {
    await client.close().catch(() => undefined);
    throw new Error(
      "Could not reach MongoDB. Check MONGODB_URI and that the database is running."
    );
  }

  const db = client.db();
  const indexes = ensureIndexes(db).catch(async (error: unknown) => {
    delete globalStore.__asyvMongo;
    await client.close().catch(() => undefined);
    throw error;
  });

  globalStore.__asyvMongo = { client, indexes };
  await indexes;
  return db;
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Set MONGODB_URI in .env.local before using the hub.");
  }

  const cached = globalStore.__asyvMongo;
  if (cached) {
    await cached.indexes;
    return cached.client.db();
  }

  if (!connecting) {
    connecting = connect(uri).finally(() => {
      connecting = null;
    });
  }

  return connecting;
}

export function isDuplicateKey(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}
