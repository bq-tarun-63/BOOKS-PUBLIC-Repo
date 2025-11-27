import { deleteGitHubFiles } from "@/lib/deleteNote/github/deleteGitHubFiles";
import { deleteNotes, removeNotesFromAccessibleNotes } from "@/lib/deleteNote/note/deleteNotes";
import { maybeDeleteImageStatus } from "@/lib/deleteNote/imageStatus/imageStatus";
import clientPromise from "@/lib/mongoDb/mongodb";
import { flattenTree } from "@/lib/deleteNote/note/helpers/flattenTree";
import { removeFromTree } from "./note/helpers/removeFromTree";
import type { INote } from "@/models/types/Note";
import { VectorService } from "@/services/vectorService";
import { ObjectId } from "mongodb";

interface TreeNode {
  _id: string;
  children?: TreeNode[];
  [key: string]: unknown;
}

/**
 * Permanently deletes a note and all its descendants from MongoDB and GitHub.
 * @param noteId The _id of the note to delete (string)
 */

export async function permanentlyDeleteNote(noteId: string) {
  const client = await clientPromise();
  const db = client.db();
  const collection = db.collection<INote>("notes");
  const imageStatusCollection = db.collection("imageStatus");

  // 1. Locate the note
  const note = await collection.findOne({ _id: new ObjectId(noteId) });
  if (!note) throw new Error("Note not found");

  // If the note has rootParentId, it's a main node: proceed with full tree logic
  if (note.noteType === "original") {
    const itsReviewNote = await collection.findOne({ parentId: String(note._id),noteType: "review" });
    if (itsReviewNote && itsReviewNote.approvalStatus !== "pending") {
      permanentlyDeleteNote(String(itsReviewNote._id));
    }
    const rootId = note.rootParentId || note._id;
    const rootNote = await collection.findOne({ _id: typeof rootId === "string" ? new ObjectId(rootId) : rootId });
    if (!rootNote || !Array.isArray(rootNote.tree)) throw new Error("Root note or tree not found");
    let subtree: TreeNode[] = [];
    function findSubtree(tree: TreeNode[]): TreeNode[] {
      for (const node of tree) {
        if (node._id === noteId) return [node];
        if (node.children) {
          const found = findSubtree(node.children);
          if (found.length) return found;
        }
      }
      return [];
    }
    subtree = findSubtree(rootNote.tree as TreeNode[]);
    const allIds = flattenTree(subtree);
    const filePaths: string[] = [];
    const imageDirs: string[] = [];
    const notes = await collection.find({ _id: { $in: allIds.map((id) => new ObjectId(id)) } }).toArray();

    // Remove all notes from vector database
    try {
      for (const id of allIds) {
        await VectorService.deleteFromVectorDB({ noteId: id });
        console.log(`Removed note ${id} from vector database`);
      }
    } catch (error) {
      console.error("Error removing notes from vector database:", error);
      // Continue with deletion even if vector cleanup fails
    }

    for (const noteDoc of notes) {
      const id = noteDoc._id.toString();
      filePaths.push(`docs/notes/${id}.json`);
      if (noteDoc.imageStatusId) {
        const imageStatus = await imageStatusCollection.findOne({ _id: noteDoc.imageStatusId });
        if (imageStatus) {
          const deleted = await maybeDeleteImageStatus(String(noteDoc.imageStatusId), noteDoc.noteType);
          const afterStatus = await imageStatusCollection.findOne({ _id: noteDoc.imageStatusId });
          if (deleted) {
            imageDirs.push(`docs/notes/${id}/images/`);
          }
        } else {
          imageDirs.push(`docs/notes/${id}/images/`);
        }
      } else {
        imageDirs.push(`docs/notes/${id}/images/`);
      }
    }
    await deleteGitHubFiles([...filePaths, ...imageDirs], `Delete notes: ${allIds.join(", ")}`);
    await deleteNotes(allIds);
    await removeNotesFromAccessibleNotes(allIds);
    const newTree = removeFromTree(rootNote.tree, noteId);
    await collection.updateOne({ _id: rootNote._id }, { $set: { tree: newTree } });
    if (note.parentId) {
      await collection.updateOne(
        { _id: new ObjectId(String(note.parentId)) },
        { $pull: { children: { _id: noteId } } } 
      );
    }
    return { deletedIds: allIds };
  }

  // Not a main node: approved or review node, skip tree logic
  if (note.noteType === "review") {
    const reviewNote = await collection.findOne({ _id: new ObjectId(String(note.parentId)) });
    if (reviewNote) {
      const originalNote = await collection.findOne({ _id: new ObjectId(reviewNote.parentId as string) });
      //to remove any orphaned review note
      if (!originalNote) {
        permanentlyDeleteNote(String(reviewNote._id));
      }
    }
  }

  // Remove from vector database
  try {
    await VectorService.deleteFromVectorDB({ noteId });
    console.log(`Removed note ${noteId} from vector database`);
  } catch (error) {
    console.error(`Error removing note ${noteId} from vector database:`, error);
    // Continue with deletion even if vector cleanup fails
  }

  const filePaths: string[] = [];
  const imageDirs: string[] = [];
  const id = note._id.toString();
  filePaths.push(`docs/notes/${id}.json`);
  if (note.imageStatusId) {
    const imageStatus = await imageStatusCollection.findOne({ _id: note.imageStatusId });
    let originalNoteId = imageStatus?.originalNoteId || note._id;
    if (imageStatus) {
      const deleted = await maybeDeleteImageStatus(String(note.imageStatusId), note.noteType);
      originalNoteId = imageStatus.originalNoteId;
      const afterStatus = await imageStatusCollection.findOne({ _id: note.imageStatusId });
      if (deleted) {
        imageDirs.push(`docs/notes/${originalNoteId}/images/`);
      }
    } else {
      imageDirs.push(`docs/notes/${originalNoteId}/images/`);
    }
  }
  await deleteGitHubFiles([...filePaths, ...imageDirs], `Delete note: ${id}`);
  await deleteNotes([id]);
  await removeNotesFromAccessibleNotes([id]);
  return { deletedIds: [id] };
}
