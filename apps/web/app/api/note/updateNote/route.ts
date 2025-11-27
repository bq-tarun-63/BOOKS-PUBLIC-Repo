import { NoteService } from "@/services/noteService";
import { canUpdateNote } from "@/utils/CheckNoteAccess/updateNote/checkAccess";
import { type NextRequest, NextResponse } from "next/server";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;
    const userId = user.id;
    const body = await req.json();
    const { id, title, parentId, icon} = body;
    if (!title || typeof title !== "string") {
      return NextResponse.json({ message: "Title is required" }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ message: "Note ID is required" }, { status: 400 });
    }
    const note = await adapterForGetNote({ id, includeContent: false });
    if (!note) {
      return NextResponse.json({ message: "Note data not found in request body" }, { status: 400 });
    }
    if (note.isPublish) {
      return NextResponse.json({ message: "Note is not editable" }, { status: 404 });
    }
    const hasAccess = canUpdateNote({ note, user });
    const isOwner = userId && note.userId.toString() === userId.toString();
    if (!hasAccess || (note?.isRestrictedPage && !isOwner)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const updateNote = await NoteService.updateNote({ NoteId: id, title, userName: user.name || "", parentId, icon });
    return NextResponse.json(updateNote, { status: 201 });
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
