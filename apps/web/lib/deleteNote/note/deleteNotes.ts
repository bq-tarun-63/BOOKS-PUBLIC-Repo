import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import { IUser } from "@/models/types/User";

export async function deleteNotes(ids: (string | ObjectId)[]) {
  const client = await clientPromise();
  const db = client.db();
  const collection = db.collection("notes");
  const objectIds = ids.map((id) =>
    typeof id === "string" ? new ObjectId(id) : id,
  );
  const result = await collection.deleteMany({ _id: { $in: objectIds } });
  return result.deletedCount;
}

/**
 * Removes deleted note IDs from all users' accessibleNotes array.
 * @param noteIds Array of note IDs (as strings or ObjectIds) to remove from accessibleNotes
 */

export async function removeNotesFromAccessibleNotes(
  noteIds: (string | ObjectId)[],
) {
  if (!noteIds || noteIds.length === 0) return;
  const client = await clientPromise();
  const db = client.db();
  const usersCollection = db.collection<IUser>("users");
  await usersCollection.updateMany(
    {},
    {
      $pull: {
        accessibleNotes: {
          noteId: { $in: noteIds.map((id) => new ObjectId(id)) },
        },
      },
    },
  );
}
