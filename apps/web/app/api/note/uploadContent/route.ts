import { canUploadContent } from "@/utils/CheckNoteAccess/uploadContent/checkAccess";
import { type NextRequest, NextResponse } from "next/server";
import { adapterForSaveContent } from "@/lib/adapter/adapterForSaveContent";
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
    const userId = user.id;
    const body = await req.json();
    const pathNameHeader = req.headers.get("x-vercel-pagename");
    if (!pathNameHeader) {
      return NextResponse.json({ message: "Missing path information" }, { status: 400 });
    }
    const pathName = pathNameHeader.split("/");
    const id = pathName[pathName.length - 1];
    if (!id) {
      return NextResponse.json({ message: "Invalid note ID" }, { status: 400 });
    }
    const note = await adapterForGetNote({ id, includeContent: false });
    if (!note) {
      return NextResponse.json({ message: "Note data not found in request body" }, { status: 400 });
    }
    if (note.isPublish) {
      return NextResponse.json({ message: "Note is not editable" }, { status: 404 });
    }
    const isOwner = userId && note.userId.toString() === userId.toString();
    let databaseNote , hasAccess;
    if(note.databaseNoteId && note.databaseNoteId!=null){
      databaseNote = await adapterForGetNote({ id: String(note.databaseNoteId), includeContent: false });
      hasAccess = canUploadContent({ note: databaseNote, user });
    }
   else{
    hasAccess = canUploadContent({ note, user });
   }
  
    if (!hasAccess) {
      
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const fileContent = JSON.stringify(body, null, 2);
    const { sha, updatedAt: time } = await adapterForSaveContent({ note, fileContent, userName: user.name || "" });
    return NextResponse.json({ sha, updatedAt: time }, { status: 200 });
  } catch (err) {
    console.error("POST /api/notes/update error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
