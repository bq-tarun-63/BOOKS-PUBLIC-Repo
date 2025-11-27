import { type NextRequest, NextResponse } from "next/server";
import { NoteService } from "@/services/noteService";
import { canShareNote } from "@/utils/CheckNoteAccess/share/checkAccess";
import { Note } from "@/models/types/Note";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
export async function POST(req: NextRequest) {
  try {    const body = await req.json();
    const {noteId} = body ;
    const note = await adapterForGetNote({ id: noteId, includeContent: false });
    const hasAccess = canShareNote({ note, user });
    if (!hasAccess) {
      return NextResponse.json({
        message: "You don't have permission to share this note",
        error: "NOT_AUTHORIZED",
        noteId
      }, { status: 403 });
    }
    if (!user.id) {
      throw new Error("User ID is required");
    }
    const response = await NoteService.shareNote({ userId: user.id, body, noteArg: note });
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error in share note API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
