
import { type NextRequest, NextResponse } from "next/server";
import { canCreateNote } from "@/utils/CheckNoteAccess/createNote/checkAccess";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { adapterForCreateNote } from "@/lib/adapter/adapterForCreateNote";
export async function POST(req: NextRequest) {
  try {    const body = await req.json();
    let { title, parentId = null, noteId, isRestrictedPage, icon = null, isPublicNote = false, databaseViewId = null, databaseProperties = null, databaseNoteId = null, workAreaId = null } = body;
    if (!title || typeof title !== "string") {
      return NextResponse.json({ message: "Title is required" }, { status: 400 });
    }
    let parentNote;
    if (parentId) {
      parentNote = await adapterForGetNote({ id: parentId, includeContent: false });
      if (!parentNote || !canCreateNote({ user, parentId, parentNote })) {
        return NextResponse.json({ message: "Forbidden: You do not have permission to create a child note here." }, { status: 403 });
      }
    }
    if (!user.id) {
      throw new Error("User ID is required");
    }
    const organizationDomain = user.organizationDomain || "";
  const newNote = await adapterForCreateNote({
    noteId,
    title,
    userId: user.id,
    userEmail: user.email,
    userName: user.name || "",
    parentId,
    icon,
    isPublicNote,
    isRestrictedPage,
    parentNote,
    organizationDomain,
    workspaceId,
    databaseViewId,
    databaseProperties,
    databaseNoteId,
    workAreaId,
    isTemplate: false,
    isPubliclyPublished: false,
  }); // always pass parentNote

    // const newNote = await NoteService.createNote(title, user.id, user.email, parentId, icon, isPublicNote ,isRestrictedPage, );
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.log("Error creating note:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
