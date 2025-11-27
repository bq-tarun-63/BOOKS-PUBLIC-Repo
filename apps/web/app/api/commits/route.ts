import { type NextRequest, NextResponse } from "next/server";
import { adapterForGetAllHistory } from "@/lib/adapter/adapterForGetAllHistory";
export const runtime = "nodejs";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const body = await req.json();
    const { noteId } = body;

    if (!noteId) {
      return NextResponse.json({ message: "Missing noteId in request body" }, { status: 400 });
    }
    
    const note = await adapterForGetNote({ id: noteId, includeContent: false });
    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 });
    }

    const contentPath = note.contentPath;
    if (!contentPath) {
      return NextResponse.json({ message: "Note content path missing" }, { status: 400 });
    }
    const validCommits = await adapterForGetAllHistory({ noteId, contentPath });
 
    return NextResponse.json({ success: true, commits: validCommits }, { status: 200 });
  } catch (err) {
    console.error("POST /api/notes/commits error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
