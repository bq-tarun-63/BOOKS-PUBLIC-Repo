import { type NextRequest, NextResponse } from "next/server";
import { NoteService } from "@/services/noteService";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { ObjectId } from "mongodb";
import crypto from "crypto";

function generatePublicSlug(): string {
  return crypto.randomBytes(6).toString("base64url");
}

export async function POST(req: NextRequest) {
  try {    const body = await req.json();
    const { id, publish } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ message: "Note ID is required" }, { status: 400 });
    }

    if (typeof publish !== "boolean") {
      return NextResponse.json({ message: "publish must be a boolean" }, { status: 400 });
    }

    const note = await adapterForGetNote({ id, includeContent: false });
    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 });
    }

    // Check permissions - user must be owner or have write access
    const isOwner = note.userId.toString() === user._id.toString();
    const hasWriteAccess = note.sharedWith?.some(
      (shared) => shared.email === user.email && shared.access === "write"
    );

    if (!isOwner && !hasWriteAccess) {
      return NextResponse.json(
        { message: "Forbidden: You do not have permission to publish this note." },
        { status: 403 }
      );
    }

    let publicSlug = note.publicSlug;

    if (publish) {
      // Generate slug if it doesn't exist
      if (!publicSlug) {
        publicSlug = generatePublicSlug();
      }

      await NoteService.updateNoteFields({
        noteId: id,
        updates: {
          isPubliclyPublished: true,
          publicSlug,
          publicPublishedAt: new Date(),
        },
      });
    } else {
      // Unpublish
      await NoteService.updateNoteFields({
        noteId: id,
        updates: {
          isPubliclyPublished: false,
        },
      });
    }

    const publicServerBaseUrl = process.env.PUBLIC_SERVER_BASE_URL || "http://localhost:3001";
    const publicUrl = publicSlug ? `${publicServerBaseUrl}/n/${publicSlug}` : null;

    return NextResponse.json(
      {
        isPubliclyPublished: publish,
        publicUrl: publish ? publicUrl : null,
        publicSlug: publish ? publicSlug : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error publishing/unpublishing note:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Note ID is required" }, { status: 400 });
    }

    const note = await adapterForGetNote({ id, includeContent: false });
    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 });
    }

    const publicServerBaseUrl = process.env.PUBLIC_SERVER_BASE_URL || "http://localhost:3001";
    const publicUrl = note.publicSlug
      ? `${publicServerBaseUrl}/n/${note.publicSlug}`
      : null;

    return NextResponse.json(
      {
        isPubliclyPublished: note.isPubliclyPublished || false,
        publicUrl,
        publicSlug: note.publicSlug || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching public status:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

