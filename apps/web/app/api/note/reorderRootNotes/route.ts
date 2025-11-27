import { NoteService } from "@/services/noteService";
import { type NextRequest, NextResponse } from "next/server";
import { canReorderRootNotes } from "@/utils/CheckNoteAccess/reorderRootNotes/checkAccess";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongoDb/mongodb";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

function orderedIdsToObjectIds(orderedIds: string[]) {
  return orderedIds.map(id => new ObjectId(id));
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;
    const body = await req.json();
    const { orderedIds } = body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }
    // Ownership check: fetch all notes and ensure user owns all
    const client = await clientPromise();

    const db = client.db();
    const collection = db.collection("notes");
    const objectIds = orderedIdsToObjectIds(orderedIds);
    
    // const notes = await collection.find({
    //   _id: { $in: objectIds },
    // }).toArray();
    
    // const allOwned = canReorderRootNotes({ notes, user });
    // if (!allOwned || notes.length !== orderedIds.length) {
    //   return NextResponse.json({ message: "Forbidden: You can only reorder your own root notes." }, { status: 403 });
    // }
    if (!user.id) {
      throw new Error("User ID is required");
    }
    await NoteService.reorderRootNotes({ userId: user.id, orderedIds });
    return NextResponse.json({ message: "ok" }, { status: 200 });
  } catch (error) {
    console.error("reorderRootNotes error", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
