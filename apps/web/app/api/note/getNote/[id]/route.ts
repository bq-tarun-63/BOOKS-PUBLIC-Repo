import { INoteWithContent, NoteService } from "@/services/noteService";
import { canReadNote } from "@/utils/CheckNoteAccess/getNote/checkAccess";
import { type NextRequest, NextResponse } from "next/server";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const includeContentHeader = req.headers.get("include-content");
    const includeContent = includeContentHeader !== null ? includeContentHeader === "true" : true;
    const contentPathHeader = req.headers.get("content-path");
    const contentPath = contentPathHeader || "";
    if (!id) {
      return NextResponse.json({ message: "Invalid note ID" }, { status: 400 });
    }
    // Get the note (no user auth on public server)
    const note = await adapterForGetNote({ id, includeContent, contentPath }) as INoteWithContent;
    let databaseNote , hasAccess;
    if(note.databaseNoteId && note.databaseNoteId!=null){
      console.log("databaseNoteId",note.databaseNoteId);
      databaseNote = await adapterForGetNote({ id: String(note.databaseNoteId), includeContent: false });
      hasAccess = canReadNote({ note: databaseNote, user: {} });
    }
    else{
      hasAccess = canReadNote({ note, user: {} });
    }
    if (!hasAccess) {
      console.log("not authorised");
      return NextResponse.json(
        {
          message: "You don't have access to this note",
          error: "NOT_AUTHORIZED",
          noteId: id,
          noteTitle: note.title,
        },
        { status: 403 },
      );
    }

    return NextResponse.json(note, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching note:", error);

    if (error instanceof Error) {
      if (error.message === "Note not found" || error.message === "Invalid note ID") {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
    }

    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
