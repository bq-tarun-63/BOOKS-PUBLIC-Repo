import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import { INote } from "@/models/types/Note";

export async function getAllDescendantNoteIds(currentId: ObjectId): Promise<ObjectId[]> {
  const client = await clientPromise();
  const db = client.db();
  const collection = db.collection<INote>("notes");

  const stack = [currentId];
  const result: ObjectId[] = [];

  while (stack.length > 0) {
    const idToProcess = stack.pop()!;
    const note = await collection.findOne({ _id: new ObjectId(idToProcess) });

    if (!note) continue;

    if (note.children && note.children.length > 0) {
      for (const child of note.children) {
        const childObjectId = new ObjectId(child._id);
        stack.push(childObjectId);
        result.push(childObjectId);
      }
    }
  }

  return result;
}

// import clientPromise from "@/lib/mongodb";
// import { ObjectId } from "mongodb";
// import { INote } from "@/models/Note";
// import { flattenTree } from "@/lib/note/helpers/flattenTree";

// export async function  getAllDescendantNoteIds(currentId: ObjectId): Promise<ObjectId[]> {
//   const client = await clientPromise();
//   const db = client.db();
//   const collection = db.collection<INote>("notes");

//   // Find the current note
//   const note = await collection.findOne({ _id: currentId });
//   if (!note) return [];

//   // Find the root note
//   const rootId = note.rootParentId ? new ObjectId(note.rootParentId) : note._id;
//   const rootNote = await collection.findOne({ _id: rootId });
//   if (!rootNote || !Array.isArray(rootNote.tree)) return [];

//   // Flatten the tree to get all IDs (including root)
//   const allIds = flattenTree(rootNote.tree);
//   // Remove the root note's own ID
//   const descendantIds = allIds.filter(id => id !== currentId.toString());
//   return descendantIds.map(id => new ObjectId(id));
// }
