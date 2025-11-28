/**
 * Public API Services
 * 
 * This file contains all service functions used by the public server APIs.
 * These are copied from the main services to isolate dependencies.
 */

import { ObjectId } from "mongodb";
import { Octokit } from "@octokit/rest";
import { MongoClient } from "mongodb";
import type { INote } from "@/models/types/Note";
import { Note } from "@/models/types/Note";
import type { IActivityLog } from "@/models/types/ActivityLogs";
import type { IDatabaseSource, IVeiwDatabase } from "@/models/types/VeiwDatabase";

// ============================================================================
// TYPES
// ============================================================================

export interface INoteWithContent extends INote {
  content: string;
  children: Array<{
    _id: string;
    title: string;
    icon: string;
    userId?: string;
    userEmail?: string;
  }>;
}

interface GitHubApiError extends Error {
  status?: number;
}

// ============================================================================
// MONGODB CONNECTION
// ============================================================================

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB_NAME; // Optional: specify database name explicitly

const mongoOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
};

let mongoClient: MongoClient | null = null;
let mongoClientPromise: Promise<MongoClient> | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (mongoClientPromise) return mongoClientPromise;

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set!");
  }

  console.log("🔌 Connecting to MongoDB...");
  console.log(`   URI: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
  if (dbName) {
    console.log(`   Database: ${dbName} (explicitly set)`);
  } else {
    console.log("   Database: (using default from URI)");
  }

  mongoClient = new MongoClient(uri, mongoOptions);
  mongoClientPromise = mongoClient
    .connect()
    .then((c) => {
      const db = dbName ? c.db(dbName) : c.db();
      console.log("✅ MongoDB connected (public-services)");
      console.log(`   Database in use: ${db.databaseName}`);
      return c;
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed (public-services):", err);
      mongoClientPromise = null;
      throw err;
    });

  return mongoClientPromise;
}

/**
 * Get the MongoDB database instance with the correct database name
 */
async function getDatabase() {
  const client = await getMongoClient();
  return dbName ? client.db(dbName) : client.db();
}

// ============================================================================
// CLUSTER MANAGER (for cluster-aware storage)
// ============================================================================

const CONTENT_CLUSTERS = [
  {
    name: "c0",
    uri: process.env.C0_MONGODB_URI || ""
  },
  {
    name: "c1",
    uri: process.env.C1_MONGODB_URI || ""
  },
];

class ClusterManager {
  private clients: Map<string, MongoClient> = new Map();

  async getClient(clusterName: string): Promise<MongoClient> {
    if (this.clients.has(clusterName)) {
      return this.clients.get(clusterName)!;
    }
    
    let cluster;
    if (clusterName === "META_MONGO_URI") {
      cluster = { name: "META_MONGO_URI", uri: process.env.META_MONGO_URI || uri };
    } else {
      cluster = CONTENT_CLUSTERS.find(c => c.name === clusterName);
    }
    
    if (!cluster) {
      throw new Error(`Cluster ${clusterName} not found`);
    }
    
    if (cluster.uri === "none" || !cluster.uri?.includes("mongodb")) {
      throw new Error(`Cluster ${clusterName} has invalid URI`);
    }

    try {
      const client = new MongoClient(cluster.uri);
      await client.connect();
      this.clients.set(clusterName, client);
      console.log(`✅ Connected to cluster: ${clusterName}`);
      return client;
    } catch (error) {
      console.error(`❌ Failed to connect to cluster ${clusterName}:`, error);
      if (clusterName !== "cluster0") {
        console.warn(`Falling back to cluster0 for content storage`);
        return this.getMetadataClient();
      }
      throw error;
    }
  }

  async getMetadataClient(): Promise<MongoClient> {
    return this.getClient("META_MONGO_URI");
  }

  async getContentClient(clusterName: string): Promise<MongoClient> {
    if (clusterName === "cluster0") {
      return this.getMetadataClient();
    }
    return this.getClient(clusterName);
  }
}

const clusterManager = new ClusterManager();

// ============================================================================
// GITHUB HELPERS
// ============================================================================

const owner = process.env.GITHUB_USERNAME || "";
const repo = process.env.GITHUB_REPO || "";
const octokit: Octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function getFileContent(path: string): Promise<{ content: string; sha: string }> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: owner as string,
      repo: repo as string,
      path,
    });

    if (Array.isArray(response.data)) {
      throw new Error("Path is a directory, not a file");
    }

    if (response.data.type !== "file" || !("content" in response.data)) {
      throw new Error("Path is not a regular file");
    }

    const content = Buffer.from(response.data.content, "base64").toString("utf-8");
    const sha = response.data.sha;

    return { content, sha };
  } catch (error: unknown) {
    if ((error as GitHubApiError).status === 404) {
      return { content: "", sha: "" };
    }
    throw error;
  }
}

// ============================================================================
// NOTE ACCESS CONTROL
// ============================================================================

export function canReadNote({ note, user }: { note: INote; user: any }): boolean {
  const isOwner = user?.id && note.userId && user.id.toString() === note.userId.toString();
  if (note.isTemplate) return true;
  if (isOwner) return true;

  if (note.isPublicNote === true) return true;
  
  if (note.noteType === "review" || note.noteType === "approved") {
    const admins = process.env.ADMINS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    return admins.includes(user?.email?.toLowerCase());
  }

  if (Array.isArray(note.sharedWith) && user?.email) {
    for (const entry of note.sharedWith) {
      if (!entry.email) continue;
      if (entry.email.toString() === user.email.toString()) {
        if (entry.access === "read" || entry.access === "write") {
          return true;
        }
      }
    }
  }

  return false;
}

// ============================================================================
// NOTE SERVICES
// ============================================================================

export const PublicNoteService = {
  /**
   * Get note content from GitHub
   */
  async getNoteContent({ contentPath }: { contentPath: string }): Promise<string> {
    try {
      const { content } = await getFileContent(contentPath);
      return content;
    } catch (error) {
      console.error("Error getting note content from GitHub:", error);
      return "";
    }
  },

  /**
   * Get note by ID with GitHub awareness (for GitHub-based storage)
   */
  async getNoteByIdwithGitHubAwareness({
    id,
    includeContent,
    contentPath = "",
  }: {
    id: string;
    includeContent: boolean;
    contentPath?: string;
  }): Promise<INoteWithContent> {
    let content = "";
    let note;
    let formattedChildren: {
      _id: string;
      title: string;
      icon: string;
      userId?: string;
      userEmail?: string;
    }[] = [];

    if (!includeContent || contentPath === "") {
      const db = await getDatabase();
      const collection = db.collection<INote>("notes");

      let noteObjectId: ObjectId;
      try {
        noteObjectId = new ObjectId(id);
      } catch (error) {
        throw new Error("Invalid note ID");
      }

      note = await collection.findOne({ _id: noteObjectId });
      if (!note) {
        throw new Error("Note not found");
      }

      formattedChildren = (note.children || []).map((child) => ({
        _id: child._id.toString(),
        title: child.title,
        icon: child.icon || "",
        userId: child.userId,
        userEmail: child.userEmail,
        isRestrictedPage: child.isRestrictedPage,
      }));
      contentPath = note.contentPath;
    }

    if (includeContent) {
      content = await this.getNoteContent({ contentPath });
    }

    return {
      ...Note.formatNote(note),
      content,
      children: formattedChildren,
    };
  },

  /**
   * Get note by ID with cluster awareness (for cluster-based storage)
   */
  async getNoteByIdwithClusterAwareness({
    id,
    includeContent,
  }: {
    id: string;
    includeContent: boolean;
  }): Promise<INoteWithContent> {
    let content = "";
    let note: INote | null;
    let formattedChildren: {
      _id: string;
      title: string;
      icon: string;
      userId?: string;
      userEmail?: string;
    }[] = [];

    // Get metadata client (cluster0)
    const metadataClient = await clusterManager.getMetadataClient();
    const metadataDb = metadataClient.db();
    const metadataCollection = metadataDb.collection<INote>("notes");

    let noteObjectId: ObjectId;
    try {
      noteObjectId = new ObjectId(id);
    } catch (error) {
      throw new Error("Invalid note ID");
    }

    // Get the note metadata from MongoDB
    note = await metadataCollection.findOne({ _id: noteObjectId });
    if (!note) {
      throw new Error("Note not found");
    }

    // Get direct children
    formattedChildren = (note.children || []).map((child) => ({
      _id: child._id.toString(),
      title: child.title,
      icon: child.icon || "",
      userId: child.userId,
      userEmail: child.userEmail,
      isRestrictedPage: child.isRestrictedPage,
    }));

    // If content is requested, fetch from the appropriate cluster
    if (includeContent) {
      try {
        if (note.clusterName) {
          const contentClient = await clusterManager.getContentClient(note.clusterName);
          const contentDb = contentClient.db();
          const contentCollection = contentDb.collection("note_content");

          const contentDoc = await contentCollection.findOne({
            noteId: note._id?.toString(),
          });

          if (contentDoc) {
            content = contentDoc.content || "";
          } else {
            content = "";
          }
        }
      } catch (error) {
        console.error(`Failed to get content for note ${note._id}:`, error);
        content = "";
      }
    }

    return {
      ...Note.formatNote(note),
      content,
      children: formattedChildren,
    };
  },
};

// ============================================================================
// ADAPTER FOR GET NOTE (storage-system-aware)
// ============================================================================

const STORAGE_SYSTEM = process.env.STORAGE_SYSTEM;

export async function adapterForGetNote({
  id,
  includeContent,
  contentPath,
}: {
  id: string;
  includeContent: boolean;
  contentPath?: string;
}): Promise<INoteWithContent> {
  if (STORAGE_SYSTEM === "github") {
    return await PublicNoteService.getNoteByIdwithGitHubAwareness({ id, includeContent, contentPath });
  } else if (STORAGE_SYSTEM === "mongodb") {
    return await PublicNoteService.getNoteByIdwithClusterAwareness({ id, includeContent });
  }
  throw new Error("Database not found");
}

// ============================================================================
// AUDIT SERVICES
// ============================================================================

export const PublicAuditService = {
  async getNoteHistory({ noteId }: { noteId: string }): Promise<IActivityLog[]> {
    try {
      const db = await getDatabase();
      const auditCollection = db.collection<IActivityLog>("audit_logs");

      const history = await auditCollection
        .find({ noteId })
        .sort({ timestamp: -1 })
        .toArray();

      return history;
    } catch (error) {
      console.error(`❌ Failed to get note history for ${noteId}:`, error);
      return [];
    }
  },
};

// ============================================================================
// DATABASE SERVICES
// ============================================================================

export const PublicDatabaseService = {
  /**
   * Get all data sources by workspace
   */
  async getAllDataSourcesByWorkspace({ workspaceId }: { workspaceId: string }) {
    const db = await getDatabase();
    const dataSourceCollection = db.collection<IDatabaseSource>("databaseSources");

    if (!workspaceId) {
      throw new Error("Workspace ID is required");
    }

    const dataSources = await dataSourceCollection
      .find({ workspaceId: workspaceId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();

    return dataSources;
  },

  /**
   * Get data source by ID
   */
  async getDataSourceById({ dataSourceId }: { dataSourceId: string }) {
    const db = await getDatabase();
    const dataSourceCollection = db.collection<IDatabaseSource>("databaseSources");
    
    const dataSource = await dataSourceCollection.findOne({ _id: new ObjectId(dataSourceId) });
    if (!dataSource) {
      throw new Error("Data source not found");
    }
    
    const notes = await db.collection<INote>("notes")
      .find({ databaseViewId: new ObjectId(dataSourceId) })
      .toArray();

    return { dataSource, notes };
  },

  /**
   * Get collection (view) by ID
   */
  async getCollectionById({ viewId }: { viewId: string }) {
    const db = await getDatabase();
    const viewCollections = db.collection<IVeiwDatabase>("viewDatabases");
    const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");

    const viewCollection = await viewCollections.findOne({
      _id: new ObjectId(viewId),
    });
    
    if (!viewCollection) {
      throw new Error("View not found");
    }

    // Get database source from view
    let databaseSource: IDatabaseSource | null = null;
    if (viewCollection.viewsType && viewCollection.viewsType.length > 0) {
      const databaseSourceId = viewCollection.viewsType[0]?.databaseSourceId;
      if (databaseSourceId) {
        databaseSource = await databaseSourcesCollection.findOne({
          _id: databaseSourceId,
        });
      }
    }

    const noteCollection = await db.collection<INote>("notes");
    const sourceId = (viewCollection as any)?.sourceDatabaseId
      ? new ObjectId((viewCollection as any).sourceDatabaseId)
      : (viewCollection?._id || new ObjectId(viewId));

    // Get notes linked to this view/source
    const notes = await noteCollection
      .find({ databaseViewId: sourceId })
      .toArray();

    return {
      viewCollection,
      databaseSource,
      notes,
    };
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  getMongoClient as clientPromise,
  getDatabase,
  clusterManager,
  octokit,
  owner,
  repo,
};

