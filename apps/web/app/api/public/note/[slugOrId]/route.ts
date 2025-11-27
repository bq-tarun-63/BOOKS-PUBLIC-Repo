import { type NextRequest, NextResponse } from "next/server";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongoDb/mongodb";
import type { INote } from "@/models/types/Note";

export async function GET(
  req: NextRequest,
  { params }: { params: { slugOrId: string } }
) {
  try {
    const { slugOrId } = params;

    if (!slugOrId) {
      return NextResponse.json({ message: "Note identifier is required" }, { status: 400 });
    }

    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<INote>("notes");

    let note: INote | null = null;

    // Try to find by publicSlug first
    note = await collection.findOne({ publicSlug: slugOrId, isPubliclyPublished: true });

    // If not found by slug, try by ID
    if (!note && ObjectId.isValid(slugOrId)) {
      note = await collection.findOne({ 
        _id: new ObjectId(slugOrId), 
        isPubliclyPublished: true 
      });
    }

    if (!note) {
      return NextResponse.json(
        { message: "Note not found or not published" },
        { status: 404 }
      );
    }

    if (!note.isPubliclyPublished) {
      return NextResponse.json(
        { message: "This note is not publicly available" },
        { status: 404 }
      );
    }

    // Return only safe fields for public consumption
    const safeNote = {
      id: note._id?.toString(),
      title: note.title,
      contentPath: note.contentPath,
      commitSha: note.commitSha,
      icon: note.icon,
      coverUrl: note.coverUrl,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      publicSlug: note.publicSlug,
      publicPublishedAt: note.publicPublishedAt,
    };

    return NextResponse.json(safeNote, { status: 200 });
  } catch (error) {
    console.error("Error fetching public note:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

