import { NoteService } from "@/services/noteService";
import { type NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  try {    const rootNotes = await NoteService.getUserRootNotes({ userId: String(user.id), userObj: user, workspaceId: workspaceId || "" });
    const res = NextResponse.json(rootNotes, { status: 200 });
 return res;
  } catch (error) {
    console.error("Error in /api/note/getNoteParent:", error);
    return NextResponse.json(
      {
        message: "Failed to load notes",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
