import { type NextRequest, NextResponse } from "next/server";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { adapterForGetVersionContent } from "@/lib/adapter/adapterForGetVersionContent";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const { noteId, sha,version } = await req.json();
    if (!noteId || !sha)
      return NextResponse.json({ message: "Missing noteId or sha" }, { status: 400 });

    const note = await adapterForGetNote({ id: noteId, includeContent: false });
    if (!note)
      return NextResponse.json({ message: "Note not found" }, { status: 404 });

    const { contentPath} = note;
    if (!contentPath)
      return NextResponse.json({ message: "Note content path missing" }, { status: 400 });
    const content = await adapterForGetVersionContent({ noteId, contentPath, sha, version });
    return NextResponse.json(content, { status: 200 });
  } catch (err) {
    console.error("POST /api/notes/content error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
