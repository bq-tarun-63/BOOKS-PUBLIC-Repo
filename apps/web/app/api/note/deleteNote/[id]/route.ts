
import { type NextRequest, NextResponse } from "next/server";
import { canDeleteNote } from "@/utils/CheckNoteAccess/deleteNote/checkAccess";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { adapterForDeleteNote } from "@/lib/adapter/adapterForDeleteNote";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Missing noteId in URL params" }, { status: 400 });
    }
    const note = await adapterForGetNote({ id, includeContent: false });
    const hasAccess = canDeleteNote({ note, user });
    if (!hasAccess) {
      return NextResponse.json({
        message: "You don't have permission to delete this note",
        error: "NOT_AUTHORIZED",
        noteId: id,
        noteTitle: note.title,
      }, { status: 403 });
      }
      const result = await adapterForDeleteNote({ noteId: id });
    return NextResponse.json({ success: true, deletedIds: result.deletedIds });
  } catch (error: unknown) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { message: "Server error", error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
