import { NextRequest, NextResponse } from "next/server";
import { NoteService } from "@/services/noteService";
import { canTogglePublicNote } from "@/utils/CheckNoteAccess/togglePublicNote/checkAccess";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
export async function PUT(req: NextRequest) {
  try {    const body = await req.json();
    const { noteId, isPublicNote, isRestrictedPage } = body;

    if (!noteId || typeof isPublicNote !== "boolean" || typeof isRestrictedPage !== "boolean") {
      return NextResponse.json({ message: "noteId, isPublicNote, and isRestrictedPage (boolean) are required" }, { status: 400 });
    }

    const note = await adapterForGetNote({ id: noteId, includeContent: false });
    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 });
    }

    const hasAccess = canTogglePublicNote({ note, user });

    if (!hasAccess) {
      return NextResponse.json({ message: "Forbidden: You do not have permission to toggle public status for this note." }, { status: 403 });
    }

    const updatedNote = await NoteService.updateIsPublicNote({ noteId, isPublicNote, isRestrictedPage, noteArg: note });
    return NextResponse.json(updatedNote, { status: 200 });
  } catch (error) {
    console.error("Error toggling isPublicNote:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
} 