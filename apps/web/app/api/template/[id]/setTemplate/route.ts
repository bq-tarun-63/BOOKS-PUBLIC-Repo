import { NextRequest, NextResponse } from "next/server";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { canUpdateNote } from "@/utils/CheckNoteAccess/updateNote/checkAccess";
import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import { INote } from "@/models/types/Note";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const { id } = await params;
    const body = await req.json();
    const { isTemplate } = body;

    if (typeof isTemplate !== "boolean") {
      return NextResponse.json(
        { message: "isTemplate must be a boolean" },
        { status: 400 },
      );
    }

    // Get the note
    const note = await adapterForGetNote({ id, includeContent: false });
    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 });
    }

    // Check permissions - only note owner can mark as template
    const hasAccess = canUpdateNote({ note, user });
    if (!hasAccess) {
      return NextResponse.json(
        { message: "You don't have permission to modify this note" },
        { status: 403 },
      );
    }

    // Only root notes can be templates (notes without parentId)
    if (isTemplate && note.parentId) {
      return NextResponse.json(
        { message: "Only root notes can be marked as templates" },
        { status: 400 },
      );
    }

    // Update the note
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");

    await notesCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isTemplate: isTemplate,
          updatedAt: new Date(),
        },
      },
    );

    // Get updated note
    const updatedNote = await notesCollection.findOne({ _id: new ObjectId(id) });
    if (!updatedNote) {
      return NextResponse.json({ message: "Failed to retrieve updated note" }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Note ${isTemplate ? "marked as" : "unmarked from"} template successfully`,
        note: {
          _id: String(updatedNote._id),
          id: String(updatedNote._id),
          title: updatedNote.title,
          isTemplate: updatedNote.isTemplate,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating template status:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update template status",
      },
      { status: 500 },
    );
  }
}

