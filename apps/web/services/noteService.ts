import { getAllDescendantNoteIds } from "@/lib/getAllDescendantNoteIds";
import { createOrUpdateFile, getFileContent, octokit, owner, repo } from "@/lib/github/github";
import clientPromise from "@/lib/mongoDb/mongodb";
import { splitTree, removeFromTree } from "@/lib/deleteNote/note/helpers/removeFromTree";
import { permanentlyDeleteNote } from "@/lib/deleteNote/permanentlyDeleteNote";
import type { IImageStatus } from "@/models/types/ImageStatus";
import { type INote, Note } from "@/models/types/Note";
import type { IUser, NoteAccessType } from "@/models/types/User";
import { UserService } from "@/services/userService";
import { WorkAreaService } from "@/services/workAreaService";
import { sendEmail } from "@/lib/emailNotification/sendEmailNotification";
import { ObjectId } from "mongodb";
import type { WithId } from "mongodb";
import { defaultEditorContent } from "../lib/content";
import { addOrUpdateImageStatus } from "../lib/deleteNote/imageStatus/imageStatus";
import { VectorService } from "./vectorService";
import { IApprovedNote } from "@/models/types/ApprovedNote";
import { getNoteSharedHtml } from "@/lib/emailNotification/emailTemplate/noteSharedTemplate";
import { getApprovalEmailHtml } from "@/lib/emailNotification/emailTemplate/getApprovalTemplate";
import { getApprovalEmailTemplate } from "@/lib/emailNotification/emailTemplate/giveApprovalTemplate";
import { WorkspaceService } from "@/services/workspaceService";
import { isGeneratorFunction } from "util/types";
import { clusterManager } from "@/lib/mongoDb/clusterManager";
import { updateContentWithJsonDiffpatch } from "@/services/versions/versionService";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { AuditService } from "./auditService";
import { Octokit } from "@octokit/rest";
import type { IVeiwDatabase } from "@/models/types/VeiwDatabase";

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

export function isValidObjectId(id: string | undefined | null): id is string {
  return !!id && /^[0-9a-fA-F]{24}$/.test(id);
}

export async function giveNoteAccessToAdmins({
  noteId,
  access,
}: {
  noteId: ObjectId;
  access: NoteAccessType;
}) {
  const client = await clientPromise();
  const db = client.db();
  const usersCollection = db.collection<IUser>("users");
  const notesCollection = db.collection<INote>("notes");

  // Step 1: Get admin emails from env
  const adminEmails = process.env.ADMINS?.split(",").map((email) =>
    email.trim(),
  );
  if (!adminEmails || adminEmails.length === 0) {
    throw new Error("No admin emails found in environment variables");
  }

  // Step 2: Find all admin users
  const adminUsers = await usersCollection
    .find({ email: { $in: adminEmails } })
    .toArray();

  // Step 3: Update accessibleNotes for each admin
  const bulkOps = adminUsers.map((admin) => ({
    updateOne: {
      filter: {
        _id: admin._id,
        "accessibleNotes.noteId": { $ne: noteId },
      },
      update: {
        $push: {
          accessibleNotes: {
            noteId,
            access,
          },
        },
        $set: { updatedAt: new Date() },
      },
    },
  }));

  if (bulkOps.length > 0) {
    await usersCollection.bulkWrite(bulkOps);
  }

  // Step 4: Update note.sharedWith for each admin (by userId)
  const note = await notesCollection.findOne({ _id: noteId });
  if (!note) throw new Error("Note not found");

  const existingSharedUserIds: string[] = (note.sharedWith || []).map(
    (entry: any) => entry.email.toString(),
  );
  const newSharedWithEntries = adminUsers
    .filter((admin) => !existingSharedUserIds.includes(admin.email.toString()))
    .map((admin) => ({
      email: admin.email,
      access: access, // read/write
    }));

  if (newSharedWithEntries.length > 0) {
    await notesCollection.updateOne(
      { _id: noteId },
      {
        $push: {
          sharedWith: {
            $each: newSharedWithEntries,
          },
        },
        $set: { updatedAt: new Date() },
      },
    );
  }
}

export const NoteService = {
  async createCover({ id }: { id: string }) {
    const coverurl = [
      "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb9.jpg-16700a4d-2002-4bb5-9a58-093f846f4891",
      "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb10.jpg-b2ed6e01-04fa-4aa5-9348-2e174bced6d1",
      "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb11.jpg-74b82ff6-4c24-4624-b9b5-271018338cc5",
      "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb8.jpg-fc5e1f03-2e45-4ec4-b42c-ceea68e0914a",
      "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb7.jpg-1a8679f3-4615-4238-be82-ca7eeabb564a",
      "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb5.jpg-6e6e3edd-b5bc-4358-9057-882615687ec9",
      "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb4.jpg-f4956ea4-3be4-4038-ab37-13c443b1f747",
      "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb3.jpg-c5fa84c9-eb10-45c0-ada0-d942c375505e",
      "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb2.jpg-a5d3c718-d396-4c0e-9261-fc686a9f83a7",
      "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb1.jpg-511f13da-cd30-4431-acfd-840b180d9b72",
    ];
    const randomCover = coverurl[Math.floor(Math.random() * coverurl.length)];

    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");
    const update = await notesCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: { coverUrl: `${randomCover}`, updatedAt: new Date() },
      },
    );

    if (!update.matchedCount) {
      throw new Error("Note not found");
    }
    return {
      url: `${randomCover}`,
      id: String(id),
    };
  },
  async updateCover({ id, coverUrl }: { id: string; coverUrl: string }) {
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");
    const update = await notesCollection.updateOne(
      {
        _id: new ObjectId(String(id)),
      },
      {
        $set: { coverUrl: coverUrl },
      },
    );
    return {
      url: coverUrl,
      id: String(id),
    };
  },

  async getVersionContentGitHubAwareness({
    noteId,
    contentPath,
    sha,
  }: {
    noteId: string;
    contentPath?: string;
    sha?: string;
  }) {
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const owner = process.env.GITHUB_USERNAME;

    if (!githubToken || !owner || !repo)
      throw new Error("GitHub config missing");

    const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`;
    const response = await fetch(url, {
      headers: { Authorization: `token ${githubToken}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API error: ${text}`);
    }

    const data = await response.json();

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return content;
  },

  async getRecentNotes({ userId, workspaceId }: { userId: string; workspaceId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");
    const recentNotes = await notesCollection
      .find({ userId: new ObjectId(userId), workspaceId: workspaceId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray();
    return recentNotes;
  },
  async getHistoryGitHubAwareness({ contentPath }: { contentPath: string }) {
    // GitHub repo info
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const owner = process.env.GITHUB_USERNAME;

    if (!githubToken || !owner || !repo) {
      throw new Error("GitHub configuration missing");
    }

    // Fetch last 20 commits from GitHub API
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?path=${contentPath}&per_page=50`;
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${githubToken}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API error: ${text}`);
    }

    const commits = await response.json();

    const simplifiedCommits = await Promise.all(
      commits.map(async (c: any) => {
        try {
          const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${c.commit.tree.sha}?recursive=1`;
          const treeResponse = await fetch(treeUrl, {
            headers: {
              Authorization: `token ${githubToken}`,
            },
          });

          if (treeResponse.ok) {
            const treeData = await treeResponse.json();
            const fileBlob = treeData.tree.find(
              (item: any) => item.path === contentPath,
            );
            return fileBlob?.sha || null;
          }
          return null;
        } catch (error) {
          return null;
        }
      }),
    );

    const validCommits = commits
      .filter((_, index) => simplifiedCommits[index] !== null)
      .map((c: any, index: number) => ({
        sha: simplifiedCommits[commits.indexOf(c)],
        message: c.commit.message,
        author: c.commit.author,
        date: c.commit.author.date,
        url: c.html_url,
      }));

    return validCommits;
  },

  async permanentlyDeleteNoteFromMongoDB({ noteId }: { noteId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");
    const usersCollection = db.collection<IUser>("users");
    const commentsCollection = db.collection("comments");
    const notificationsCollection = db.collection("notifications");
    const imageStatusCollection = db.collection("imageStatus");

    // 1. Get the note to delete
    const note = await notesCollection.findOne({ _id: new ObjectId(noteId) });
    if (!note) throw new Error("Note not found");

    // 2. Get all descendant note IDs (for cascade deletion)
    const noteObjectId = new ObjectId(noteId);
    const descendantIds = await getAllDescendantNoteIds(noteObjectId);
    const allNoteIds = [noteObjectId, ...descendantIds];
    const allNoteIdStrings = allNoteIds.map((id) => id.toString());

    console.log(`🗑️ [DELETE NOTE] Deleting note ${noteId} and ${descendantIds.length} descendants`);

    // 3. Delete from vector database (all notes)
    try {
      for (const id of allNoteIdStrings) {
        await VectorService.deleteFromVectorDB({ noteId: id });
      }
      console.log(`✅ [DELETE NOTE] Removed ${allNoteIdStrings.length} notes from vector database`);
    } catch (error) {
      console.error("❌ [DELETE NOTE] Error removing from vector database:", error);
      // Continue with deletion even if vector cleanup fails
    }

    // 4. Delete inline comments (all notes)
    try {
      const commentDeleteResult = await commentsCollection.deleteMany({
        noteId: { $in: allNoteIds },
      });
      console.log(`✅ [DELETE NOTE] Deleted ${commentDeleteResult.deletedCount} inline comments`);
    } catch (error) {
      console.error("❌ [DELETE NOTE] Error deleting inline comments:", error);
    }

    // 5. Delete notifications referencing these notes (all notes)
    try {
      // First, get notification IDs before deleting
      const notificationsToRemove = await notificationsCollection
        .find({ noteId: { $in: allNoteIds } })
        .project({ _id: 1 })
        .toArray();
      const notificationIds = notificationsToRemove.map((n) => n._id);

      // Delete notifications
      if (notificationIds.length > 0) {
        const notificationDeleteResult = await notificationsCollection.deleteMany({
          _id: { $in: notificationIds },
        });
        console.log(`✅ [DELETE NOTE] Deleted ${notificationDeleteResult.deletedCount} notifications`);

        // Remove notification IDs from all users' notifications arrays
        await usersCollection.updateMany(
          {},
          { $pull: { notifications: { $in: notificationIds } } },
        );
        console.log(`✅ [DELETE NOTE] Removed notification references from users`);
      }
    } catch (error) {
      console.error("❌ [DELETE NOTE] Error deleting notifications:", error);
    }

    // 6. Remove from all users' accessibleNotes (all notes)
    try {
      await usersCollection.updateMany(
        {},
        {
          $pull: {
            accessibleNotes: {
              noteId: { $in: allNoteIds },
            },
          },
        },
      );
      console.log(`✅ [DELETE NOTE] Removed notes from all users' accessibleNotes`);
    } catch (error) {
      console.error("❌ [DELETE NOTE] Error removing from accessibleNotes:", error);
    }

    // 7. Remove from parent's children array (only for the main note, not descendants)
    if (note.parentId) {
      try {
        await notesCollection.updateOne(
          { _id: new ObjectId(String(note.parentId)) },
          { $pull: { children: { _id: noteId } } },
        );
        console.log(`✅ [DELETE NOTE] Removed from parent's children array`);
      } catch (error) {
        console.error("❌ [DELETE NOTE] Error removing from parent:", error);
      }
    }

    // 8. Update tree structure in root note (only for the main note)
    if (note.rootParentId) {
      try {
        const rootId = typeof note.rootParentId === "string" ? new ObjectId(note.rootParentId) : note.rootParentId;
        const rootNote = await notesCollection.findOne({ _id: rootId });
        if (rootNote && Array.isArray(rootNote.tree)) {
          const newTree = removeFromTree(rootNote.tree as any[], noteId);
          await notesCollection.updateOne(
            { _id: rootId },
            { $set: { tree: newTree } },
          );
          console.log(`✅ [DELETE NOTE] Updated root note's tree structure`);
        }
      } catch (error) {
        console.error("❌ [DELETE NOTE] Error updating tree structure:", error);
      }
    }

    // 9. Clear published note references (notes that reference these as publishedNoteId)
    try {
      await notesCollection.updateMany(
        { publishedNoteId: { $in: allNoteIds } },
        { $set: { publishedNoteId: "" } },
      );
      console.log(`✅ [DELETE NOTE] Cleared published note references`);
    } catch (error) {
      console.error("❌ [DELETE NOTE] Error clearing published note references:", error);
    }

    // 10. Clear database note references (notes that reference these via databaseNoteId)
    try {
      await notesCollection.updateMany(
        { databaseNoteId: { $in: allNoteIds } },
        { $set: { databaseNoteId: undefined } },
      );
      console.log(`✅ [DELETE NOTE] Cleared database note references`);
    } catch (error) {
      console.error("❌ [DELETE NOTE] Error clearing database note references:", error);
    }

    // 11. Delete database views, sources, and view types created for these notes
    try {
      const viewDatabasesCollection = db.collection("viewDatabases");
      const databaseSourcesCollection = db.collection("databaseSources");
      const viewTypesCollection = db.collection("viewTypes");

      // Find all view databases where noteId matches any of the notes being deleted
      // This includes views created by the main note AND any of its descendants
      const viewsToDelete = await viewDatabasesCollection
        .find({ noteId: { $in: allNoteIdStrings } })
        .toArray();

      if (viewsToDelete.length > 0) {
        console.log(`🗑️ [DELETE NOTE] Found ${viewsToDelete.length} view database(s) to delete (from main note and descendants)`);

        const allViewTypeIds: ObjectId[] = [];
        const allDatabaseSourceIds: ObjectId[] = [];
        const viewIds = viewsToDelete.map(v => v._id).filter((id): id is ObjectId => id !== undefined);

        // Collect all view type IDs and database source IDs from all views
        for (const view of viewsToDelete) {
          if (view.viewsType && Array.isArray(view.viewsType)) {
            for (const viewType of view.viewsType) {
              // Collect view type ID
              if (viewType._id) {
                const viewTypeId = typeof viewType._id === "string" ? new ObjectId(viewType._id) : viewType._id;
                allViewTypeIds.push(viewTypeId);
              }

              // Collect database source ID
              if (viewType.databaseSourceId) {
                const sourceId = typeof viewType.databaseSourceId === "string" 
                  ? new ObjectId(viewType.databaseSourceId) 
                  : viewType.databaseSourceId;
                if (!allDatabaseSourceIds.some(id => id.equals(sourceId))) {
                  allDatabaseSourceIds.push(sourceId);
                }
              }
            }
          }
        }

        // 11a. Find and delete all notes that are part of these database sources
        if (allDatabaseSourceIds.length > 0) {
          try {
            // Find all notes that belong to these database sources
            const databaseNotes = await notesCollection
              .find({ databaseViewId: { $in: allDatabaseSourceIds } })
              .project({ _id: 1 })
              .toArray();

            if (databaseNotes.length > 0) {
              console.log(`🗑️ [DELETE NOTE] Found ${databaseNotes.length} note(s) in database view(s) to delete`);

              // Get all descendant IDs for each database note
              const databaseNoteIds: ObjectId[] = [];
              for (const dbNote of databaseNotes) {
                const dbNoteId = dbNote._id;
                if (dbNoteId) {
                  const dbNoteObjectId = typeof dbNoteId === "string" ? new ObjectId(dbNoteId) : dbNoteId;
                  
                  // Check if already in allNoteIds to avoid duplicates
                  if (!allNoteIds.some(id => id.equals(dbNoteObjectId))) {
                    databaseNoteIds.push(dbNoteObjectId);
                    
                    // Get all descendants of this database note
                    const dbDescendants = await getAllDescendantNoteIds(dbNoteObjectId);
                    for (const descId of dbDescendants) {
                      if (!allNoteIds.some(id => id.equals(descId)) && !databaseNoteIds.some(id => id.equals(descId))) {
                        databaseNoteIds.push(descId);
                      }
                    }
                  }
                }
              }

              // Add database notes and their descendants to the deletion list
              if (databaseNoteIds.length > 0) {
                allNoteIds.push(...databaseNoteIds);
                const newNoteIdStrings = databaseNoteIds.map(id => id.toString());
                allNoteIdStrings.push(...newNoteIdStrings);
                console.log(`✅ [DELETE NOTE] Added ${databaseNoteIds.length} database note(s) and descendants to deletion list`);

                // Clean up database notes (vectors, comments, notifications, etc.)
                // Note: These will be included in the main cleanup steps below, but we do it here
                // to ensure they're processed even if something fails later
                try {
                  // Delete from vector database
                  for (const id of newNoteIdStrings) {
                    try {
                      await VectorService.deleteFromVectorDB({ noteId: id });
                    } catch (err) {
                      // Continue even if vector deletion fails
                    }
                  }

                  // Delete inline comments
                  await commentsCollection.deleteMany({
                    noteId: { $in: databaseNoteIds },
                  });

                  // Delete notifications
                  const dbNotifications = await notificationsCollection
                    .find({ noteId: { $in: databaseNoteIds } })
                    .project({ _id: 1 })
                    .toArray();
                  const dbNotificationIds = dbNotifications.map((n) => n._id);
                  if (dbNotificationIds.length > 0) {
                    await notificationsCollection.deleteMany({
                      _id: { $in: dbNotificationIds },
                    });
                    await usersCollection.updateMany(
                      {},
                      { $pull: { notifications: { $in: dbNotificationIds } } },
                    );
                  }

                  // Remove from users' accessibleNotes
                  await usersCollection.updateMany(
                    {},
                    {
                      $pull: {
                        accessibleNotes: {
                          noteId: { $in: databaseNoteIds },
                        },
                      },
                    },
                  );

                  console.log(`✅ [DELETE NOTE] Cleaned up vectors, comments, and notifications for database notes`);
                } catch (error) {
                  console.error("❌ [DELETE NOTE] Error cleaning up database notes:", error);
                  // Continue - these will be handled in the main cleanup steps anyway
                }
              }
            }
          } catch (error) {
            console.error("❌ [DELETE NOTE] Error finding database notes:", error);
          }
        }

        // Delete view types
        if (allViewTypeIds.length > 0) {
          const viewTypeDeleteResult = await viewTypesCollection.deleteMany({
            _id: { $in: allViewTypeIds },
          });
          console.log(`✅ [DELETE NOTE] Deleted ${viewTypeDeleteResult.deletedCount} view type(s)`);
        }

        // Delete database sources (only if not used by other views that belong to notes NOT being deleted)
        if (allDatabaseSourceIds.length > 0) {
          // Check which sources are still referenced by views that belong to notes NOT being deleted
          // This is critical: we must not delete a source if it's linked to a note we're NOT deleting
          const allRemainingViews = await viewDatabasesCollection
            .find({ 
              _id: { $nin: viewIds }, // Views not being deleted
              "viewsType.databaseSourceId": { $in: allDatabaseSourceIds }
            })
            .toArray();

          // Filter to only views whose noteId is NOT in our deletion list
          // This ensures we don't delete sources shared with notes we're keeping
          const viewsLinkedToNonDeletedNotes = allRemainingViews.filter(
            view => view.noteId && !allNoteIdStrings.includes(String(view.noteId))
          );

          // Collect database source IDs that are still in use by notes we're NOT deleting
          const sourcesInUse = new Set<ObjectId>();
          for (const view of viewsLinkedToNonDeletedNotes) {
            if (view.viewsType && Array.isArray(view.viewsType)) {
              for (const viewType of view.viewsType) {
                if (viewType.databaseSourceId) {
                  const sourceId = typeof viewType.databaseSourceId === "string" 
                    ? new ObjectId(viewType.databaseSourceId) 
                    : viewType.databaseSourceId;
                  sourcesInUse.add(sourceId);
                }
              }
            }
          }

          // Only delete sources that are not in use by views belonging to notes we're NOT deleting
          const sourcesToDelete = allDatabaseSourceIds.filter(id => !sourcesInUse.has(id));
          
          if (sourcesToDelete.length > 0) {
            const sourceDeleteResult = await databaseSourcesCollection.deleteMany({
              _id: { $in: sourcesToDelete },
            });
            console.log(`✅ [DELETE NOTE] Deleted ${sourceDeleteResult.deletedCount} database source(s) (${allDatabaseSourceIds.length - sourcesToDelete.length} kept as they're linked to notes we're NOT deleting)`);
          } else {
            console.log(`ℹ️ [DELETE NOTE] All database sources are linked to notes we're NOT deleting, skipping deletion`);
          }
        }

        // Delete view databases
        if (viewIds.length > 0) {
          const viewDeleteResult = await viewDatabasesCollection.deleteMany({
            _id: { $in: viewIds },
          });
          console.log(`✅ [DELETE NOTE] Deleted ${viewDeleteResult.deletedCount} view database(s)`);
        }
      } else {
        console.log(`ℹ️ [DELETE NOTE] No view databases found for these notes`);
      }
    } catch (error) {
      console.error("❌ [DELETE NOTE] Error deleting database views/sources/view types:", error);
    }

    // 12. Delete image status records (all notes)
    try {
      const notesToDelete = await notesCollection
        .find({ _id: { $in: allNoteIds } })
        .project({ _id: 1, imageStatusId: 1, noteType: 1 })
        .toArray();

      const { maybeDeleteImageStatus } = await import("@/lib/deleteNote/imageStatus/imageStatus");
      for (const noteDoc of notesToDelete) {
        if (noteDoc.imageStatusId) {
          await maybeDeleteImageStatus(
            String(noteDoc.imageStatusId),
            (noteDoc.noteType as any) || "original",
          );
        }
      }
      console.log(`✅ [DELETE NOTE] Processed image status for ${notesToDelete.length} notes`);
    } catch (error) {
      console.error("❌ [DELETE NOTE] Error deleting image status:", error);
    }

    // 13. Delete note content from clusters (all notes)
    try {
      const notesWithClusters = await notesCollection
        .find({ _id: { $in: allNoteIds } })
        .project({ _id: 1, clusterName: 1 })
        .toArray();

      const clusterMap = new Map<string, string[]>();
      for (const noteDoc of notesWithClusters) {
        if (noteDoc.clusterName) {
          const cluster = noteDoc.clusterName;
          if (!clusterMap.has(cluster)) {
            clusterMap.set(cluster, []);
          }
          clusterMap.get(cluster)!.push(noteDoc._id.toString());
        }
      }

      for (const [clusterName, noteIds] of clusterMap.entries()) {
        try {
          const contentClient = await clusterManager.getContentClient(clusterName);
          const contentDb = contentClient.db();
          const contentCollection = contentDb.collection("note_content");
          await contentCollection.deleteMany({ noteId: { $in: noteIds } });
          console.log(`✅ [DELETE NOTE] Deleted content from cluster ${clusterName} for ${noteIds.length} notes`);
        } catch (error) {
          console.error(`❌ [DELETE NOTE] Error deleting content from cluster ${clusterName}:`, error);
        }
      }
    } catch (error) {
      console.error("❌ [DELETE NOTE] Error deleting note content:", error);
    }

    // 14. Delete note documents (all notes) - DO THIS LAST
    try {
      const deleteResult = await notesCollection.deleteMany({
        _id: { $in: allNoteIds },
      });
      console.log(`✅ [DELETE NOTE] Deleted ${deleteResult.deletedCount} note documents`);
    } catch (error) {
      console.error("❌ [DELETE NOTE] Error deleting note documents:", error);
      throw error; // Re-throw as this is critical
    }

    console.log(`🎉 [DELETE NOTE] Successfully deleted note ${noteId} and ${descendantIds.length} descendants`);
    return { deletedIds: allNoteIdStrings };
  },
  async createOrUpdatePublishedNote({
    originalNoteId,
    originalNoteObj,
  }: {
    originalNoteId: string;
    originalNoteObj?: INote;
  }): Promise<INoteWithContent> {
    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<INote>("notes");

    const originalObjectId = new ObjectId(originalNoteId);
    const originalNote =
      originalNoteObj || (await collection.findOne({ _id: originalObjectId }));
    await collection.updateOne(
      { _id: originalObjectId },
      { $set: { approvalStatus: "pending" } },
    );

    if (!originalNote) throw new Error("Original note not found");

    const originalContent = await NoteService.getNoteContent({
      contentPath: originalNote.contentPath,
    });

    let publishedNoteId = originalNote.publishedNoteId;
    let publishedNote: INote;
    let isNew = false;

    if (!publishedNoteId) {
      // Create a new ObjectId for the published note
      publishedNoteId = new ObjectId();
      isNew = true;
    }

    const newPath = `docs/notes/${publishedNoteId}.json`;
    const existingPublishedNote = await collection.findOne({
      _id: publishedNoteId,
    });

    const { sha } = await createOrUpdateFile({
      path: newPath,
      content: originalContent,
      message: `${
        existingPublishedNote ? "Update" : "Create"
      } published note: ${originalNote.title}`,
      sha: existingPublishedNote?.commitSha || "",
    });

    publishedNote = {
      ...originalNote,
      _id: publishedNoteId,
      parentId: originalNoteId,
      contentPath: newPath,
      commitSha: sha,
      isPublish: true,
      approvalStatus: "pending",
      createdAt: existingPublishedNote?.createdAt || new Date(),
      updatedAt: new Date(),
      imageStatusId: originalNote.imageStatusId,
      workspaceId: originalNote.workspaceId,
      noteType: "review",
    };

    delete publishedNote.publishedNoteId; // avoid circular reference

    if (isNew) {
      await collection.insertOne(publishedNote);
      await collection.updateOne(
        { _id: originalObjectId },
        { $set: { publishedNoteId } },
      );
    } else {
      await collection.replaceOne({ _id: publishedNoteId }, publishedNote);
    }
    await giveNoteAccessToAdmins({ noteId: publishedNoteId, access: "read" });
    const adminEmails: string[] = (process.env.ADMINS || "")
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    const approveLink = `${process.env.MAIL_LINK}/${publishedNoteId}`;

    for (const email of adminEmails) {
      sendEmail({
        to: email,
        subject: `Review Required: ${originalNote.title}`,
        html: getApprovalEmailHtml(originalNote.title, approveLink),
      });
    }

    await addOrUpdateImageStatus(
      originalNote.imageStatusId as ObjectId,
      "review",
    );

    if (!publishedNote) {
      throw new Error("publishedNote is undefined");
    }
    if (!publishedNote.imageStatusId) {
      throw new Error("imageStatusId is missing from the note");
    }

    return {
      ...Note.formatNote(publishedNote),
      content: originalContent,
      children: [],
    };
  },

  async giveApproval({
    noteId,
    approved,
    email,
  }: {
    noteId: string;
    approved: boolean;
    email: string;
  }): Promise<INote & { content?: string; githubRawUrl?: string }> {
    // 1. Validate noteId
    if (!isValidObjectId(noteId)) {
      throw new Error("Invalid noteId format");
    }
    const _noteId = new ObjectId(noteId);
    // 2. Connect to DB and update approval status
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");
    const approvedCollection = db.collection<IApprovedNote>("approved");

    const newStatus: "approved" | "rejected" = approved
      ? "approved"
      : "rejected";

    const updatedNote = await notesCollection.findOneAndUpdate(
      { _id: _noteId },
      { $set: { approvalStatus: newStatus, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!updatedNote) {
      throw new Error("Note not found");
    }
    if (updatedNote.parentId) {
      const parentObjectId = new ObjectId(updatedNote.parentId);
      const res = await notesCollection.findOneAndUpdate(
        { _id: parentObjectId },
        {
          $set: {
            approvalStatus: newStatus,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" },
      );
    }

    // const updatedNote = updatedNoteResult.value;
    const noteTitle = updatedNote.title;

    // 3. Send approval/rejection email
    const { subject, html } = getApprovalEmailTemplate(noteTitle, approved);

    sendEmail({ to: email, subject, html: html });

    // If rejected, check for orphaned node and clean up if needed

    let githubRawUrl: string | undefined = "";

    // 4. If approved, create published note
    let publishedNote;
    if (approved) {
      // 5. Check if published note already exists (by parentId)
      const existingPublishedNote = await notesCollection.findOne({
        parentId: updatedNote._id as string,
        isPublish: true,
      });

      const { content: fileContent } = await getFileContent(
        updatedNote.contentPath,
      );

      let publishedNoteId: ObjectId | string;
      let isNew = false;
      publishedNote = existingPublishedNote ?? {
        title: updatedNote.title,
        userId: updatedNote.userId,
        userEmail: updatedNote.userEmail,
        parentId: updatedNote._id as string,
        contentPath: "", // will be set
        commitSha: "", // will be set
        createdAt: new Date(),
        updatedAt: new Date(),
        icon: updatedNote.icon,
        children: [],
        isPublish: true,
        isPublic: 1,
        sharedWith: [],
        approvalStatus: "accepted",
        imageStatusId: updatedNote.imageStatusId,
        noteType: "approved",
        isPublicNote: updatedNote.isPublicNote,
        workspaceId: updatedNote.workspaceId,
      };

      if (!existingPublishedNote) {
        // Insert new published note
        const insertResult = await notesCollection.insertOne(publishedNote);
        publishedNoteId = insertResult.insertedId;
        isNew = true;
      } else {
        publishedNoteId = existingPublishedNote._id;
      }

      // 6. Push to GitHub
      const githubPath = `docs/notes/${publishedNoteId.toString()}.json`;
      const { sha: newSha } = await createOrUpdateFile({
        path: githubPath,
        content: fileContent,
        message: `Publish note ${updatedNote.title}`,
        branch: "main",
        sha: publishedNote.commitSha || "",
      });

      // 7. Update GitHub info in published note
      await notesCollection.updateOne(
        { _id: publishedNoteId },
        {
          $set: {
            contentPath: githubPath,
            commitSha: newSha,
            approvalStatus: "accepted",
            updatedAt: new Date(),
            icon: updatedNote.icon,
            noteType: "approved",
            imageStatusId: updatedNote.imageStatusId,
          },
        },
      );

      // 8. Build GitHub raw URL
      const owner = process.env.GITHUB_USERNAME || "";
      const repo = process.env.GITHUB_REPO || "";
      const branch = "main";
      githubRawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${githubPath}`;

      // Store in approved collection if approved
      if (approved && githubRawUrl) {
        const collection = db.collection<IUser>("users");
        const user = await collection.findOne({ email });
        if (!user?.name) throw new Error("User name not found");
        const Author = user?.name;
        await approvedCollection.insertOne({
          noteId: _noteId,
          githubRawUrl,
          author: Author,
          title: updatedNote.title,
          userEmail: updatedNote.userEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await addOrUpdateImageStatus(
        new ObjectId(String(updatedNote.imageStatusId)),
        "approved",
      );
    }

    if (!updatedNote) {
      throw new Error("updatedNote is undefined");
    }
    if (!updatedNote.imageStatusId) {
      throw new Error("imageStatusId is missing from the note");
    }
    let finalNote;
    //accepeted or rejected we will check if its original exists then okayty if not then we will delete it
    if (await NoteService.handleRejectedNoteCleanup({ rejectedNoteId: noteId })) {
      return { ...finalNote, githubRawUrl };
    }

    // 5. Return original note info with content (and optional raw GitHub URL)
    finalNote = await adapterForGetNote({ id: noteId, includeContent: true });
    return { ...finalNote, githubRawUrl };
  },
  async createNoteinGitHub({
    noteId,
    title,
    userId,
    userEmail,
    userName,
    parentId,
    icon,
    isPublicNote,
    isRestrictedPage,
    parentNote,
    organizationDomain,
    workspaceId,
    databaseViewId,
    databaseProperties,
    databaseNoteId,
    workAreaId,
    isTemplate = false,
  }: {
    noteId: string;
    title: string;
    userId: string;
    userEmail: string;
    userName: string;
    parentId?: string | null;
    icon?: string;
    isPublicNote?: boolean;
    isRestrictedPage?: boolean;
    parentNote?: any;
    organizationDomain?: string;
    workspaceId?: string;
    databaseViewId?: string;
    databaseProperties?: Record<string, any>;
    databaseNoteId?: string;
    workAreaId?: string;
    isTemplate?: boolean;
  }): Promise<
    INoteWithContent | { parent: INoteWithContent; child: INoteWithContent }
  > {
    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<INote>("notes");
    // 1. Pre-generate ObjectId
    const newId = new ObjectId(noteId);

    // 2. Use ObjectId in path
    const contentPath = `docs/notes/${newId.toHexString()}.json`;

    // 3. Check if this is a child note
    let parent: WithId<INote> | null = null;
    let parentObjectId: ObjectId | null = null;
    let rootParentId: string | ObjectId | undefined = undefined;
    let rootNote: WithId<INote> | null = null;

    if (parentId) {
      try {
        parentObjectId = new ObjectId(parentId);
        parent =
          parentNote || (await collection.findOne({ _id: parentObjectId }));
        if (!parent) {
          throw new Error("Parent note not found");
        }
        // Determine rootParentId
        rootParentId = parent.rootParentId || parent._id;
        // Fetch the root note
        rootNote = await collection.findOne({ _id: rootParentId });
        if (!rootNote) {
          throw new Error("Root note not found");
        }
      } catch (error) {
        throw new Error("Invalid parent ID");
      }
    }
    const defaultContent = JSON.stringify(defaultEditorContent, null, 2);
    // 4. Create file in GitHub
    const { sha } = await createOrUpdateFile({
      path: contentPath,
      content: defaultContent,
      message: parentId
        ? `Create child note: ${title}`
        : `Create new note: ${title}`,
    });
    // const inheritedIsPublicNote = parent?.isPublicNote ?? isPublicNote ?? false;

    // 5. Insert into MongoDB with userId
    let userObjectId: ObjectId;
    try {
      userObjectId = new ObjectId(String(userId));
    } catch (error) {
      throw new Error("Invalid user ID");
    }

    const siblingsQuery = parentId
      ? { parentId }
      : { parentId: null, userId: userObjectId };
    const lastSibling = await collection
      .find(siblingsQuery)
      .sort({ order: -1 })
      .limit(1)
      .next();
    const order = lastSibling?.order !== undefined ? lastSibling.order + 1 : 0;
    // Pre-generate imageStatusId
    const imageStatusId = new ObjectId();

    // Select cluster for this note
    const clusterName = clusterManager.selectContentCluster(noteId);

    const newNote: INote = {
      _id: newId,
      title,
      userId: userObjectId,
      userEmail: userEmail,
      parentId: parentId || null,
      contentPath,
      commitSha: sha,
      createdAt: new Date(),
      updatedAt: new Date(),
      order,
      children: [],
      icon: icon || "",
      isPublish: false,
      isPublic: 0, // 👈 Safe casting or fallback
      sharedWith: parent?.sharedWith || [], //COPY sharedWith from parent
      approvalStatus: "Publish",
      isPublicNote: isPublicNote as boolean,
      rootParentId: rootParentId,
      noteType: "original",
      isRestrictedPage: (isRestrictedPage as boolean) || false,
      isTemplate: Boolean(isTemplate),
      imageStatusId, // set at insert time
      organizationDomain: organizationDomain || "", // NEW
      workspaceId: workspaceId || "", // NEW
      clusterName, // Assign selected cluster
      workAreaId: workAreaId|| "",
    };
    if (databaseViewId) {
      newNote.databaseViewId = new ObjectId(databaseViewId);
      newNote.noteType = "Viewdatabase_Note";
    }
    if (databaseNoteId != null) {
      newNote.databaseNoteId = new ObjectId(databaseNoteId);
    }
    if (databaseProperties) {
      newNote.databaseProperties = databaseProperties;
    }
    // If root note, set tree to itself as the root node
    if (!parentId) {
      newNote.tree = [
        {
          _id: newId.toString(),
          title,
          icon: icon || "",
          userId: userId,
          userEmail: userEmail,
          children: [],
        },
      ];
      // Only insert the note if root
      await collection.insertOne(newNote);
    } else {
      // Ensure parentObjectId and rootParentId are not null
      if (!parentObjectId || !rootParentId || !rootNote) {
        throw new Error("Parent or root note not found");
      }
      // If child, use bulkWrite for note insert, parent update, and root update
      const bulkOps = [
        { insertOne: { document: newNote } },
        {
          updateOne: {
            filter: { _id: parentObjectId },
            update: {
              $push: {
                children: {
                  _id: newId.toString(),
                  title: title,
                  icon: icon || "",
                  userId: userId,
                  userEmail: userEmail,
                  isRestrictedPage: isRestrictedPage,
                },
              },
              $set: { updatedAt: new Date() },
            },
          },
        },
        {
          updateOne: {
            filter: { _id: rootParentId },
            update: {
              $set: {
                tree: NoteService.addToTree({ tree: rootNote.tree || [], parentId, newChild: {
                  _id: newId.toString(),
                  title: title,
                  icon: icon || "",
                  userId: userId,
                  userEmail: userEmail,
                  children: [],
                } }),
                updatedAt: new Date(),
              },
            },
          },
        },
      ];
      await collection.bulkWrite(bulkOps);
    }

    // Insert the image status with the pre-generated id
    const imageStatus: IImageStatus = {
      _id: imageStatusId, // set the _id explicitly
      originalNoteId: newId,
      imageUrl: `docs/notes/${newId}/images/`,
      isCreatedUsed: true,
      isPublishedUsed: false,
      isApprovedUsed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      noteType: "original",
    };
    await db.collection<IImageStatus>("imageStatus").insertOne(imageStatus);

    // 6. Fetch content from GitHub
    const content = await NoteService.getNoteContent({ contentPath });

    const formattedNote = {
      ...Note.formatNote(newNote),
      content,
      children: [],
    };

    // 7. If this is a child note, update the parent and root's tree
    // if (parentId && parentObjectId && rootNote) {
    //   // Update parent's children and updatedAt
    //   await collection.updateOne(
    //     { _id: parentObjectId },
    //     {
    //       $push: {
    //         children: {
    //           _id: newId.toString(),
    //           title: title,
    //           icon: icon || "",
    //           userId: userId,
    //           userEmail: userEmail,
    //           isRestrictedPage: isRestrictedPage,
    //         },
    //       },
    //       $set: { updatedAt: new Date() },
    //     },
    //   );

    //   // Update the root note's tree
    //   const updatedTree = NoteService.addToTree(rootNote.tree || [], parentId, {
    //     _id: newId.toString(),
    //     title: title,
    //     icon: icon || "",
    //     userId: userId,
    //     userEmail: userEmail,
    //     children: [],
    //   });
    //   await collection.updateOne(
    //     { _id: rootParentId },
    //     { $set: { tree: updatedTree, updatedAt: new Date() } },
    //   );

    //   // Get the updated parent with children
    //   const updatedParent = await NoteService.getNoteById(parentId, false, "");

    //   return {
    //     parent: updatedParent,
    //     child: formattedNote,
    //   };
    // }

    // Log audit for note creation
  
    await AuditService.log({
      action: "CREATE",
      noteId: newId.toString(),
      userId,
      userEmail,
      userName,
      noteName: title,
      serviceType: "GITHUB",
      field: "note",
      oldValue: undefined,
      newValue: title,
      workspaceId,
      organizationDomain,
    });

    // For root notes, just return the note
    return formattedNote;
  },

  async createNoteinMongoDB({
    noteId,
    title,
    userId,
    userEmail,
    userName,
    parentId,
    icon,
    isPublicNote,
    isRestrictedPage,
    parentNote,
    organizationDomain,
    workspaceId,
    databaseViewId,
    databaseProperties,
    databaseNoteId,
    workAreaId,
    isTemplate = false,
  }: {
    noteId: string;
    title: string;
    userId: string;
    userEmail: string;
    userName: string;
    parentId?: string | null;
    icon?: string;
    isPublicNote?: boolean;
    isRestrictedPage?: boolean;
    parentNote?: any;
    organizationDomain?: string;
    workspaceId?: string;
    databaseViewId?: string;
    databaseProperties?: Record<string, any>;    
    databaseNoteId?: string;
    workAreaId?: string;
    isTemplate?: boolean;
  }): Promise<
    INoteWithContent | { parent: INoteWithContent; child: INoteWithContent }
  > {
    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<INote>("notes");
    // 1. Pre-generate ObjectId
    const newId = new ObjectId(noteId);

    // 2. Use ObjectId in path
    const contentPath = `docs/notes/${newId.toHexString()}.json`;

    // 3. Check if this is a child note
    let parent: WithId<INote> | null = null;
    let parentObjectId: ObjectId | null = null;
    let rootParentId: string | ObjectId | undefined = undefined;
    let rootNote: WithId<INote> | null = null;

    if (parentId) {
      try {
        parentObjectId = new ObjectId(parentId);
        parent =
          parentNote || (await collection.findOne({ _id: parentObjectId }));
        if (!parent) {
          throw new Error("Parent note not found");
        }
        // Determine rootParentId
        rootParentId = parent.rootParentId || parent._id;
        // Fetch the root note
        rootNote = await collection.findOne({ _id: rootParentId });
        if (!rootNote) {
          throw new Error("Root note not found");
        }
      } catch (error) {
        throw new Error("Invalid parent ID");
      }
    }
    const defaultContent = JSON.stringify(defaultEditorContent, null, 2);
    // 5. Insert into MongoDB with userId
    let userObjectId: ObjectId;
    try {
      userObjectId = new ObjectId(String(userId));
    } catch (error) {
      throw new Error("Invalid user ID");
    }

    const siblingsQuery = parentId
      ? { parentId }
      : { parentId: null, userId: userObjectId };
    const lastSibling = await collection
      .find(siblingsQuery)
      .sort({ order: -1 })
      .limit(1)
      .next();
    const order = lastSibling?.order !== undefined ? lastSibling.order + 1 : 0;
    // Pre-generate imageStatusId
    const imageStatusId = new ObjectId();

    // Select cluster for this note
    const clusterName = clusterManager.selectContentCluster(noteId);

    const newNote: INote = {
      _id: newId,
      title,
      userId: userObjectId,
      userEmail: userEmail,
      parentId: parentId || null,
      contentPath,
      commitSha: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      order,
      children: [],
      icon: icon || "",
      isPublish: false,
      isPublic: 0, // 👈 Safe casting or fallback
      sharedWith: parent?.sharedWith || [], //COPY sharedWith from parent
      approvalStatus: "Publish",
      isPublicNote: isPublicNote as boolean,
      rootParentId: rootParentId,
      noteType: "original",
      isRestrictedPage: (isRestrictedPage as boolean) || false,
      isTemplate: Boolean(isTemplate),
      imageStatusId, // set at insert time
      organizationDomain: organizationDomain || "", // NEW
      workspaceId: workspaceId || "", // NEW
      clusterName, // Assign selected cluster
      coverUrl:"",     
      workAreaId: workAreaId|| "",
    };
    if (databaseViewId) {
      newNote.databaseViewId = new ObjectId(databaseViewId);
      newNote.noteType = "Viewdatabase_Note";
    }
    if (databaseNoteId != null) {
      newNote.databaseNoteId = new ObjectId(databaseNoteId);
    }
    if (databaseProperties) {
      newNote.databaseProperties = databaseProperties;
    }
    // If root note, set tree to itself as the root node
    if (!parentId) {
      newNote.tree = [
        {
          _id: newId.toString(),
          title,
          icon: icon || "",
          userId: userId,
          userEmail: userEmail,
          children: [],
        },
      ];
      // Only insert the note if root
      await collection.insertOne(newNote);
    } else {
      // Ensure parentObjectId and rootParentId are not null
      if (!parentObjectId || !rootParentId || !rootNote) {
        throw new Error("Parent or root note not found");
      }
      // If child, use bulkWrite for note insert, parent update, and root update
      const bulkOps = [
        { insertOne: { document: newNote } },
        {
          updateOne: {
            filter: { _id: parentObjectId },
            update: {
              $push: {
                children: {
                  _id: newId.toString(),
                  title: title,
                  icon: icon || "",
                  userId: userId,
                  userEmail: userEmail,
                  isRestrictedPage: isRestrictedPage,
                },
              },
              $set: { updatedAt: new Date() },
            },
          },
        },
        {
          updateOne: {
            filter: { _id: rootParentId },
            update: {
              $set: {
                tree: NoteService.addToTree({ tree: rootNote.tree || [], parentId, newChild: {
                  _id: newId.toString(),
                  title: title,
                  icon: icon || "",
                  userId: userId,
                  userEmail: userEmail,
                  children: [],
                } }),
                updatedAt: new Date(),
              },
            },
          },
        },
      ];
      await collection.bulkWrite(bulkOps);
    }

    // Insert the image status with the pre-generated id
    const imageStatus: IImageStatus = {
      _id: imageStatusId, // set the _id explicitly
      originalNoteId: newId,
      imageUrl: `docs/notes/${newId}/images/`,
      isCreatedUsed: true,
      isPublishedUsed: false,
      isApprovedUsed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      noteType: "original",
    };
    await db.collection<IImageStatus>("imageStatus").insertOne(imageStatus);

    // 6. Fetch content from GitHub
    const content = await NoteService.getNoteContent({ contentPath });

    const formattedNote = {
      ...Note.formatNote(newNote),
      content,
      children: [],
    };

    // 7. If this is a child note, update the parent and root's tree
    // if (parentId && parentObjectId && rootNote) {
    //   // Update parent's children and updatedAt
    //   await collection.updateOne(
    //     { _id: parentObjectId },
    //     {
    //       $push: {
    //         children: {
    //           _id: newId.toString(),
    //           title: title,
    //           icon: icon || "",
    //           userId: userId,
    //           userEmail: userEmail,
    //           isRestrictedPage: isRestrictedPage,
    //         },
    //       },
    //       $set: { updatedAt: new Date() },
    //     },
    //   );

    //   // Update the root note's tree
    //   const updatedTree = NoteService.addToTree(rootNote.tree || [], parentId, {
    //     _id: newId.toString(),
    //     title: title,
    //     icon: icon || "",
    //     userId: userId,
    //     userEmail: userEmail,
    //     children: [],
    //   });
    //   await collection.updateOne(
    //     { _id: rootParentId },
    //     { $set: { tree: updatedTree, updatedAt: new Date() } },
    //   );

    //   // Get the updated parent with children
    //   const updatedParent = await adapterForGetNote(parentId, false, "");

    //   return {
    //     parent: updatedParent,
    //     child: formattedNote,
    //   };
    // }

    // Log audit for note creation
  
    await AuditService.log({
      action: "CREATE",
      noteId: newId.toString(),
      userId,
      userEmail,
      userName,
      noteName: title,
      serviceType: "MONGODB",
      field: "note",
      oldValue: undefined,
      newValue: title,
      workspaceId,
      organizationDomain,
    });

    // For root notes, just return the note
    return formattedNote;
  },
  // Helper: Recursively add a child to the tree
  addToTree({ tree, parentId, newChild }: { tree: any[]; parentId: string; newChild: any }): any[] {
    return tree.map((node) => {
      if (node._id === parentId) {
        // Ensure children array exists
        const children = Array.isArray(node.children) ? node.children : [];
        return {
          ...node,
          children: [...children, newChild],
        };
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        return {
          ...node,
          children: this.addToTree({ tree: node.children, parentId, newChild }),
        };
      }
      return node;
    });
  },
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
      userId?: string | undefined;
      userEmail?: string | undefined;
    }[] = [];

    // 1. Get metadata client (cluster0)
    const metadataClient = await clusterManager.getMetadataClient();
    const metadataDb = metadataClient.db();
    const metadataCollection = metadataDb.collection<INote>("notes");

    let noteObjectId: ObjectId;
    try {
      noteObjectId = new ObjectId(id);
    } catch (error) {
      throw new Error("Invalid note ID");
    }

    // 2. Get the note metadata from MongoDB
    note = await metadataCollection.findOne({ _id: noteObjectId });
    if (!note) {
      throw new Error("Note not found");
    }

    // 3. Get direct children (first level only) with user information
    formattedChildren = (note.children || []).map((child) => ({
      _id: child._id.toString(),
      title: child.title,
      icon: child.icon || "",
      userId: child.userId,
      userEmail: child.userEmail,
      isRestrictedPage: child.isRestrictedPage,
    }));

    // 4. If content is requested, fetch from the appropriate cluster
    if (includeContent) {
      try {
        // Check if this is a cluster-aware note
        if (note.clusterName) {
          // Get content from the note's assigned cluster
          const contentClient = await clusterManager.getContentClient(
            note.clusterName,
          );
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
      userId?: string | undefined;
      userEmail?: string | undefined;
    }[] = [];
    if (!includeContent || contentPath === "") {
      const client = await clientPromise();
      const db = client.db();
      const collection = db.collection<INote>("notes");

      let noteObjectId: ObjectId;
      try {
        noteObjectId = new ObjectId(id);
      } catch (error) {
        throw new Error("Invalid note ID");
      }

      // Get the note metadata from MongoDB
      note = await collection.findOne({ _id: noteObjectId });
      if (!note) {
        throw new Error("Note not found");
      }

      // Get direct children (first level only) with user information
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
      // Fetch from GitHub using provided contentPath
      content = await NoteService.getNoteContent({ contentPath });
    }
    return {
      ...Note.formatNote(note),
      content,
      children: formattedChildren,
    };
  },
  
  async getUserRootNotes({
    userId,
    userObj,
    workspaceId,
  }: {
    userId: string;
    userObj?: IUser;
    workspaceId?: string;
  }): Promise<Array<INoteWithContent>> {
  
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");
    const usersCollection = db.collection<IUser>("users");

    let userObjectId: ObjectId;
    try {
      userObjectId = new ObjectId(userId);
    } catch (error) {
      throw new Error("Invalid user ID");
    }

    // Use provided user object if available, otherwise fetch from DB
    const user =
      userObj || (await usersCollection.findOne({ _id: userObjectId }));

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is admin
    const adminEmails = process.env.ADMINS ? process.env.ADMINS.split(",") : [];
    const isAdmin = adminEmails.includes(user.email);
   

    // Extract accessible noteIds (if any)
    const accessibleNoteIds: ObjectId[] =
      user.accessibleNotes?.map((entry) => entry.noteId) ?? [];

    // Get workarea access if workspaceId is provided
    let accessibleWorkAreaIds: string[] = [];
    if (workspaceId) {
      try {
        const workspaceObjectId = new ObjectId(workspaceId);
        accessibleWorkAreaIds = await WorkAreaService.getUserAccessibleWorkAreaIds(
          userId,
          user.email,
          workspaceObjectId
        );
      } catch (error) {
        console.error("Error getting workarea access:", error);
      }
    }

      const orConditions = [
        { parentId: null, userId: userObjectId , noteType: { $ne: "Viewdatabase_Note" as INote["noteType"] } }, // Personal root notes
        ...(accessibleNoteIds.length > 0 
            ? [{ _id: { $in: accessibleNoteIds } }] 
            : []), // Notes shared with the user
        { isPublicNote: true, parentId: null ,noteType: { $ne: "Viewdatabase_Note" as INote["noteType"] }}, // Public root notes
        ...(accessibleWorkAreaIds.length > 0
          ? [{ 
              parentId: null, 
              workAreaId: { $in: accessibleWorkAreaIds },
              noteType: { $ne: "Viewdatabase_Note" as INote["noteType"] }
            }]
          : []), // Notes from accessible workareas
        ...(isAdmin
          ? [
              {
                $or: [
  
                  { 
                    noteType: "review" as INote["noteType"], 
                    approvalStatus: { $in: ["pending"] as INote["approvalStatus"][] }
                  },
                  {
                    noteType: "approved" as INote["noteType"] 
                  },
                ],
              },
            ]
          : []),
      ];
      const query: any = { $or: orConditions };
  if (workspaceId) {
    query.$and = [
      { $or: [{ workspaceId }, { workspaceId: new ObjectId(workspaceId) }] }
    ];
  }
   
    const workspaceNotes = await notesCollection
      .find(query)
      .toArray();

    // Fetch global templates (always available)
    const templateNotes = await notesCollection
      .find({
        isTemplate: true,
        parentId: null,
      })
      .toArray();

    const allNotes = [...workspaceNotes, ...templateNotes];

    // Deduplicate by _id as before
    const combinedNotesMap = new Map<string, INote>();
    allNotes.forEach((note) => {
      if (note._id) {
        combinedNotesMap.set(note._id.toString(), note);
      }
    });

    // Format notes for response and populate children with user information
    const notesWithChildren = Array.from(combinedNotesMap.values())
      .map((note) => ({
        ...Note.formatNote(note),
        content: "", // Empty content for root notes list
        children: note.children || [], // Use existing children array
      }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return notesWithChildren;
  },
  async getNoteContent({ contentPath }: { contentPath: string }): Promise<string> {
    try {
      const { content } = await getFileContent(contentPath);
      return content;
    } catch (error) {
      console.error("Error getting note content from GitHub:", error);
      return "";
    }
  },

  // Cluster-aware version of updateContent
  async updateContentMongoDBAwareness({
    note,
    content,
    userName,
  }: {
    note: INote;
    content: string;
    userName: string;
  }): Promise<{ sha: string; time: Date }> {
    const time = new Date();

    // Generate a new commit SHA for consistency
    let sha = "";

    try {
      // 1. Get metadata client
      const metadataClient = await clusterManager.getMetadataClient();
      const metadataDb = metadataClient.db();
      const metadataCollection = metadataDb.collection<INote>("notes");

      // 2. Check if this is a cluster-aware note
      if (note.clusterName) {
        try {
          // 3. Get content client for the note's cluster
         
          const contentClient = await clusterManager.getContentClient(
            note.clusterName,
          );
          const contentDb = contentClient.db();
          const contentCollection = contentDb.collection("note_content");

          // 4. Store version using jsondiffpatch FIRST (before updating content)
          const versionResult = await updateContentWithJsonDiffpatch({
            note,
            incomingContent: content,
            authorId: note.userId?.toString(),
            clientOpId: sha || undefined,
          });

          // Update the sha with the operation ID from version service
          sha = versionResult.opId;
          

          // 5. Update or insert content using noteId (original logic) - AFTER version tracking
          const contentDoc = await contentCollection.findOne({
            noteId: note._id?.toString(),
          });
          if (!contentDoc) {
            await contentCollection.insertOne({
              noteId: note._id?.toString() || "",
              clusterName: note.clusterName,
              content: content,
              createdAt: time,
              updatedAt: time,
            });
          } else {
            await contentCollection.updateOne(
              { noteId: note._id?.toString() },
              {
                $set: {
                  content: content,
                  updatedAt: time,
                },
              },
            );
          }

         
        } catch (error) {
          console.error(
            `❌ Failed to update content in cluster ${note.clusterName}:`,
            error,
          );
        }
      }
      // 6. Update metadata in metadata collection
      await metadataCollection.updateOne(
        { _id: note._id },
        {
          $set: {
            commitSha: sha,
            approvalStatus: "Publish",
            updatedAt: time,
          },
        },
      );

      // 7. Log audit for content update
    
      await AuditService.log({
        action: "UPDATE",
        noteId: note._id?.toString() || "",
        userId: note.userId?.toString() || "",
        userEmail: note.userEmail || "",
        userName,
        noteName: note.title || "",
        serviceType: "MONGODB",
        field: "content",
        oldValue: undefined,
        newValue: content,
        workspaceId: note.workspaceId,
        organizationDomain: note.organizationDomain,
      });

      return { sha, time };
    } catch (error) {
      console.error(`Failed to update content for note ${note._id}:`, error);
      throw error;
    }
  },
  async updateContentGitHubAwareness({
    note,
    content,
    userName,
  }: {
    note: INote;
    content: string;
    userName: string;
  }): Promise<{ sha: string; time: Date }> {
    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<INote>("notes");

    const { sha } = await createOrUpdateFile({
      path: note.contentPath,
      content,
      message: `Update content for note: ${note.title}`,
      sha: note.commitSha,
    });
    const time = new Date();
    await collection.updateOne(
      { _id: note._id },
      {
        $set: {
          commitSha: sha,
          approvalStatus: "Publish",
          updatedAt: time,
        },
      },
    );

    // Log audit for content update
    
    await AuditService.log({
      action: "UPDATE",
      noteId: note._id?.toString() || "",
      userId: note.userId?.toString() || "",
      userEmail: note.userEmail || "",
      userName,
      noteName: note.title || "",
      serviceType: "GITHUB",
      field: "content",
      oldValue: undefined,
      newValue: content,
      workspaceId: note.workspaceId,
      organizationDomain: note.organizationDomain,
    });

    // Update the note in vector database if VectorService is available
    try {
      const noteId = String(note._id);
      const metadata = {
        noteId,
        title: note.title,
        contentPath: note.contentPath,
        userId: note.userId.toString(),
        userEmail: note.userEmail,
        isPublic: note.isPublicNote,
        updatedAt: time.toISOString(),
        noteType: note.noteType,
      };
      // Sync to vector database
      //await VectorService.syncToVectorDB({ noteId, content, metadata });
    } catch (error) {
      // Don't fail note update if vector indexing fails
      console.error(
        `Failed to update note ${note._id} in vector database:`,
        error,
      );
    }

    return { sha, time };
  },
  async updateNote({
    NoteId,
    title,
    userName,
    parentId,
    icon,
  }: {
    NoteId: string;
    title: string;
    userName: string;
    parentId?: string;
    icon?: string;
  }): Promise<INote> {
    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<INote>("notes");

    let noteObjectId: ObjectId;
    try {
      noteObjectId = new ObjectId(NoteId);
    } catch {
      throw new Error("Invalid note ID");
    }

    const updatedNote = await collection.findOneAndUpdate(
      { _id: noteObjectId },
      {
        $set: {
          title,
          icon: icon || "",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!updatedNote) {
      throw new Error("Failed to retrieve updated note");
    }

    if (parentId && parentId !== "") {
      const updatedParentNote = await collection.findOneAndUpdate(
        {
          _id: new ObjectId(parentId),
          "children._id": NoteId,
        },
        {
          $set: {
            "children.$.title": title,
            "children.$.icon": icon || "",
          },
        },
        { returnDocument: "after" },
      );
    }
   

    // Log audit for note update
   
    await AuditService.log({
      action: "UPDATE",
      noteId: NoteId,
      userId: updatedNote.userId?.toString() || "",
      userEmail: updatedNote.userEmail || "",
      userName,
      noteName: updatedNote.title || "",
      serviceType: "MONGODB",
      field: "title",
      oldValue: undefined,
      newValue: title,
      workspaceId: updatedNote.workspaceId,
      organizationDomain: updatedNote.organizationDomain,
    });

    return updatedNote;
  },

  async shareNote({
    userId,
    body,
    noteArg,
  }: {
    userId: string;
    body: Record<string, unknown>;
    noteArg?: any;
  }) {
    let { noteId, isPublic, sharedWith } = body as {
      noteId: string;
      isPublic?: number;
      sharedWith: Array<{ email: string; permission: string }>;
    };

    if (!noteId || !isValidObjectId(noteId)) {
      throw new Error("Invalid or missing noteId");
    }
    //make sure shareWith have all lowercase emails
    const sharedWithToLowerCase = sharedWith.map((entry) => ({
      email: entry.email.toLowerCase(),
      permission: entry.permission,
    }));
    sharedWith = sharedWithToLowerCase;
    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<INote>("notes");
    const usersCollection = db.collection<IUser>("users");

    // Use the provided note if available, otherwise fetch from DB
    const note: INote =
      noteArg ||
      (await collection.findOne({
        _id: new ObjectId(noteId),
        userId: new ObjectId(userId),
      }));

    if (!note) {
      throw new Error("Note not found or not authorized");
    }

    const updateFields: Partial<INote> = {};
    if (typeof isPublic === "number" && [0, 1, 2].includes(isPublic)) {
      updateFields.isPublic = isPublic as 0 | 1 | 2;
    }

    const existingSharedWith = note.sharedWith || [];
    const link = `${process.env.MAIL_LINK}/${note._id}`;

    for (const entry of sharedWith) {
      let user = await UserService.findUserByEmail({ email: entry.email });
      if (!user) {
        user = await UserService.createUser({ userData: { email: entry.email } });
      }
      if (!note.workspaceId) {
        throw new Error("Workspace ID is required");
      }
      const workspace = await WorkspaceService.getWorkspaceById({
        workspaceId: String(note.workspaceId),
      });
      const workspaceName = workspace?.name || "Unknown Workspace";

      //shareBywhich usere
      const noteName = note.title;
      const sharedByUser = await UserService.findUserByEmail({ email: note.userEmail });
      if (!sharedByUser) {
        throw new Error("current user not found");
      }
      const sharedByUserName = sharedByUser.name || "Unknown User";
      const subject = `📄 A Note Has Been Shared With You`;
      const sharedTemplate = getNoteSharedHtml(
        link,
        sharedByUserName,
        workspaceName,
        noteName,
      );
      sendEmail({
        to: entry.email,
        subject: subject,
        html: sharedTemplate,
      });

      const userIdToAdd = user.id;
      const existingIndex = existingSharedWith.findIndex(
        (e) => String(e.email) === String(entry.email),
      );

      if (existingIndex >= 0 && existingSharedWith[existingIndex]) {
        existingSharedWith[existingIndex]!.access =
          entry.permission === "write" ? "write" : "read";
      } else {
        existingSharedWith.push({
          email: entry.email || "",
          access: entry.permission === "write" ? "write" : "read",
        });
      }

      const accessEntry = {
        noteId: new ObjectId(noteId),
        access: (entry.permission === "write"
          ? "write"
          : "read") as NoteAccessType,
      };

      const userObjectId = new ObjectId(userIdToAdd);
      await usersCollection.updateOne(
        {
          _id: userObjectId,
          "accessibleNotes.noteId": { $ne: accessEntry.noteId },
        },
        { $push: { accessibleNotes: accessEntry } },
      );

      await usersCollection.updateOne(
        { _id: userObjectId, "accessibleNotes.noteId": accessEntry.noteId },
        { $set: { "accessibleNotes.$.access": accessEntry.access } },
      );
    }

    updateFields.sharedWith = existingSharedWith;
    await collection.updateOne(
      { _id: new ObjectId(noteId) },
      { $set: updateFields },
    );

    ///tkae userName from email
    const user = await UserService.findUserByEmail({ email: note.userEmail });
    const userName = user?.name || "";
    // Log audit for note sharing
    
    await AuditService.log({
      action: "SHARE",
      noteId,
      userId,
      userEmail: note.userEmail,
      userName: userName || "",
      noteName: note.title || "",
      serviceType: "MONGODB",
      field: "note",
      oldValue: undefined,
      newValue: isPublic,
      workspaceId: note.workspaceId,
      organizationDomain: note.organizationDomain,
    });

    // Propagate to descendants
    const descendantNoteIds = await getAllDescendantNoteIds(
      new ObjectId(noteId),
    );
    const notesCollection = db.collection<INote>("notes");

    for (const descNoteId of descendantNoteIds) {
      const descNote = await notesCollection.findOne({ _id: descNoteId });
      if (!descNote) continue;

      const currentSharedWith = [...(descNote.sharedWith || [])];

      for (const entry of sharedWith) {
        const user = await UserService.findUserByEmail({ email: entry.email });
        if (!user) continue;

        const userIdToAdd = user.id;
        const existingIndex = currentSharedWith.findIndex(
          (e) => String(e.email) === String(entry.email),
        );

        const accessLevel = entry.permission === "write" ? "write" : "read";

        if (existingIndex >= 0 && currentSharedWith[existingIndex]) {
          currentSharedWith[existingIndex]!.access = accessLevel;
        } else {
          currentSharedWith.push({
            email: entry.email || "",
            access: accessLevel,
          });
        }
      }

      await notesCollection.updateOne(
        { _id: descNoteId },
        { $set: { sharedWith: currentSharedWith } },
      );

      // Log audit for descendant note sharing
      
      await AuditService.log({
        action: "SHARE",
        noteId: descNoteId.toString(),
        userId,
        userEmail: note.userEmail,
        userName: userName || "",
        noteName: descNote.title || "",
        serviceType: "MONGODB",
        field: "note",
        oldValue: undefined,
        newValue: isPublic,
        workspaceId: descNote.workspaceId,
        organizationDomain: descNote.organizationDomain,
      });
    }

    return { message: "Note sharing settings updated" };
  },

  /**
   * Utility: If a rejected note's original node (parentId) does not exist, delete the rejected note as well.
   */
  async handleRejectedNoteCleanup({ rejectedNoteId }: { rejectedNoteId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");
    const rejectedNote = await notesCollection.findOne({
      _id: new ObjectId(rejectedNoteId),
    });
    if (rejectedNote) {
      const originalNode = rejectedNote.parentId
        ? await notesCollection.findOne({
            _id: new ObjectId(String(rejectedNote.parentId)),
          })
        : null;
      if (!originalNode) {
        // The original node is gone, so delete the rejected node as well
        await permanentlyDeleteNote(rejectedNote._id.toString());
        return true;
      }
    }
    return false;
  },
  async reorderRootNotes({ userId, orderedIds }: { userId: string; orderedIds: string[] }) {
    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<INote>("notes");
    const userObjectId = new ObjectId(userId);
    const bulk = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id), userId: userObjectId, parentId: null },
        update: { $set: { order: index, updatedAt: new Date() } },
      },
    }));
    if (bulk.length > 0) {
      await collection.bulkWrite(bulk);
    }
    return { message: "order updated" };
  },

  async updateIsPublicNote({
    noteId,
    isPublicNote,
    isRestrictedPage,
    noteArg,
  }: {
    noteId: string;
    isPublicNote: boolean;
    isRestrictedPage: boolean;
    noteArg?: INote;
  }): Promise<INote> {
    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<INote>("notes");

    let noteObjectId: ObjectId;
    try {
      noteObjectId = new ObjectId(noteId);
    } catch {
      throw new Error("Invalid note ID");
    }

    // Use the provided note if available, otherwise fetch from DB
    const note = noteArg || (await collection.findOne({ _id: noteObjectId }));
    if (!note) throw new Error("Note not found");

    // If the note is not a root, split the tree
    if (note.parentId) {
      // Remove from parent's children
      await collection.updateOne(
        { _id: new ObjectId(note.parentId) },
        { $pull: { children: { _id: noteId } } },
      );

      // Find the root note
      const rootId = note.rootParentId
        ? new ObjectId(String(note.rootParentId))
        : new ObjectId(String(note._id));
      const rootNote = await collection.findOne({ _id: rootId });
      if (rootNote && Array.isArray(rootNote.tree)) {
        // Split the tree
        const { remainingTree, removedSubtree } = splitTree(
          rootNote.tree,
          noteId,
        );
        // Update root's tree
        await collection.updateOne(
          { _id: rootId },
          { $set: { tree: remainingTree } },
        );
        // Update this note's tree to the removed subtree (as array)
        if (removedSubtree) {
          await collection.updateOne(
            { _id: noteObjectId },
            {
              $set: {
                parentId: null,
                rootParentId: String(noteId),
                tree: [removedSubtree],
              },
            },
          );
        }
      }

      // Update all descendants' rootParentId to this note's _id
      const descendantIds = await getAllDescendantNoteIds(noteObjectId);
      if (descendantIds.length > 0) {
        await collection.updateMany(
          { _id: { $in: descendantIds } },
          { $set: { rootParentId: String(noteId) } },
        );
      }
    }

    // Now update isPublicNote and publishedNoteId for this note and all descendants
    await collection.updateOne(
      { _id: noteObjectId },
      {
        $set: {
          isPublicNote,
          isRestrictedPage,
          updatedAt: new Date(),
          publishedNoteId: "",
        },
      },
    );

    const descendantIds = await getAllDescendantNoteIds(noteObjectId);
    if (descendantIds.length > 0) {
      await collection.updateMany(
        { _id: { $in: descendantIds } },
        {
          $set: {
            isPublicNote,
            isRestrictedPage,
            updatedAt: new Date(),
            publishedNoteId: "",
          },
        },
      );
    }

    const updatedNote = await collection.findOne({ _id: noteObjectId });
    if (!updatedNote) {
      throw new Error("Failed to retrieve updated note");
    }
    return updatedNote;
  },
};

/**
 * Find notes by title and (optionally) path for a given user.
 * Returns all matches with metadata for disambiguation.
 * @param userId - The user's ID (string or ObjectId string)
 * @param title - The note title to search for
 * @param path - (Optional) The note path to search for (e.g., 'Private/')
 * @returns Array of notes with metadata
 */
export async function findNotesByTitleAndPath({
  userId,
  title,
  path,
}: {
  userId: string;
  title: string;
  path?: string;
}) {
  const client = await clientPromise();
  const db = client.db();
  const notesCollection = db.collection<INote>("notes");

  const userObjectId = new ObjectId(String(userId));

  // Build query
  const query: any = {
    title,
    $or: [
      { userId: userObjectId },
      { sharedWith: { $elemMatch: { userId: userObjectId } } },
      { isPublicNote: true },
    ],
  };

  // If path is provided, filter by path (using a regex for subpaths)
  if (path) {
    query["path"] = { $regex: `^${path}` };
  }

  // Find all matching notes
  const notes = await notesCollection.find(query).toArray();

  // Return with metadata for disambiguation
  const result = notes.map((note) => ({
    id: note._id.toString(),
    title: note.title,
    // 'path' is not a guaranteed property; reconstruct or leave as ''
    path: note.parentId ? String(note.parentId) : "",
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    parentId: note.parentId || null,
    isPublicNote: note.isPublicNote,
    userId: note.userId?.toString?.() || "",
    userEmail: note.userEmail || "",
    snippet: note.contentPath ? undefined : undefined, // Optionally fetch a snippet if needed
  }));
  return {
    requiresDisambiguation: result.length > 1,
    matches: result,
  };
}

// Utility to extract image URLs from HTML content

/**
 * Removes a note's access for a specific user.
 * @param userId - The user's ID (string or ObjectId string)
 * @param noteId - The note's ID (string or ObjectId string)
 */
export async function removeNoteAccessForUser({ user, noteId }: { user: IUser; noteId: string }) {
  const client = await clientPromise();
  const db = client.db();
  const userId = user.id;
  const userEmail = user.email;
  const usersCollection = db.collection<IUser>("users");
  const notesCollection = db.collection<INote>("notes");
  const userObjectId = new ObjectId(userId);
  const noteObjectId = new ObjectId(noteId);
  // Remove noteId from user's accessibleNotes
  await usersCollection.updateOne(
    { _id: userObjectId },
    {
      $pull: { accessibleNotes: { noteId: noteObjectId } },
      $set: { updatedAt: new Date() },
    },
  );

  // Remove user from note's sharedWith
  await notesCollection.updateOne(
    { _id: noteObjectId },
    {
      $pull: { sharedWith: { email: userEmail } },
      $set: { updatedAt: new Date() },
    },
  );
}
