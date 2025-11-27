import { type NextRequest, NextResponse } from "next/server";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { NoteService } from "@/services/noteService";
import { canUploadContent } from "@/utils/CheckNoteAccess/uploadContent/checkAccess";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ message: "Note ID is required" }, { status: 400 });
    }

    const note = await adapterForGetNote({ id, includeContent: false });
    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 });
    }

    const hasAccess = canUploadContent({ note, user });
    if (!hasAccess) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const createCover = await NoteService.createCover({ id });

    return NextResponse.json({ url: createCover.url });
  } catch (error) {
    console.error("Error reading cover images:", error);
    return NextResponse.json({ url: "" }, { status: 500 });
  }
}
