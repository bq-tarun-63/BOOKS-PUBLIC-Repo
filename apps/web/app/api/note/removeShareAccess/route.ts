import { type NextRequest, NextResponse } from "next/server";
import { removeNoteAccessForUser, NoteService } from "@/services/noteService";
import { checkNoteAccess } from "@/utils/checkNoteAccess";
import { canRemoveShareAccess } from "@/utils/CheckNoteAccess/removeShareAccess/checkAccess";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { user } = auth;
    const userId = user._id;
    const { noteId } = await req.json();
    if (!user || !userId || !noteId) {
      return NextResponse.json({ error: "Missing userId or noteId" }, { status: 400 });
    }
    const note = await adapterForGetNote({ id: noteId, includeContent: false });
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    const hasAccess = canRemoveShareAccess({ note, user });
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to remove share access for this note." }, { status: 403 });
    }
    await removeNoteAccessForUser({ user, noteId: String(noteId) }); // pass user and note objects
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}