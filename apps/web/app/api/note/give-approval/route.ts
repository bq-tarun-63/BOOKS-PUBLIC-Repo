import { NextResponse } from "next/server";
import { NoteService } from "@/services/noteService";
import { canGiveApproval } from "@/utils/CheckNoteAccess/give-approval/checkAccess";
export async function POST(req: Request) {
  try {    if (!canGiveApproval(user)) {
      return NextResponse.json({ error: "Forbidden: Only admin can give approval." }, { status: 403 });
    }
    const { noteId, approved, email } = await req.json();

    // Basic validation
    if (!noteId || typeof approved !== "boolean" || !email) {
      return NextResponse.json({ error: "noteId, approved (boolean), and email are required" }, { status: 400 });
    }

    const updatedNote = await NoteService.giveApproval({ noteId, approved, email });

    return NextResponse.json({
      message: `Note has been ${approved ? "approved" : "rejected"}, email sent to ${email}.`,
      note: updatedNote,
    });
  } catch (err: any) {
    console.error("Error in /api/notes/approve:", err);
    const status = err.message === "Note not found" ? 404 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
