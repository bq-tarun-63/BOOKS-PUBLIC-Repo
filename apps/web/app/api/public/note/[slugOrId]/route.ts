import { type NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase, adapterForGetNote } from "@/public-api-services/public-services";
import type { INote } from "@/models/types/Note";
import type { INoteWithContent } from "@/public-api-services/public-services";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slugOrId: string }> }
) {
  try {
    const { slugOrId } = await params;
    
    console.log("Getting note with slug/id:----------------------->>", slugOrId);

    if (!slugOrId) {
      return NextResponse.json({ message: "Note identifier is required" }, { status: 400 });
    }

    console.log(`[PUBLIC API] Looking for note with slug/id: ${slugOrId}`);

    const db = await getDatabase();
    const dbName = db.databaseName;
    console.log(`[PUBLIC API] Connected to database: ${dbName}`);
    
    const collection = db.collection<INote>("notes");
    
    // Log collection stats for debugging
    const collectionStats = await db.command({ collStats: "notes" }).catch(() => null);
    console.log(`[PUBLIC API] Notes collection exists:`, !!collectionStats);
    if (collectionStats) {
      console.log(`[PUBLIC API] Total notes in collection: ${collectionStats.count}`);
    }

    // Count published notes
    const publishedCount = await collection.countDocuments({ isPubliclyPublished: true });
    console.log(`[PUBLIC API] Published notes count: ${publishedCount}`);

    let note: INote | null = null;
    let noteId: string | null = null;

    // Try to find by publicSlug first
    console.log(`[PUBLIC API] Searching by publicSlug: ${slugOrId}`);
    note = await collection.findOne({ publicSlug: slugOrId, isPubliclyPublished: true });

    if (note) {
      console.log(`[PUBLIC API] Found note by publicSlug:`, note.title);
      noteId = note._id?.toString() || null;
    }

    // If not found by slug, try by ID
    if (!note && ObjectId.isValid(slugOrId)) {
      console.log(`[PUBLIC API] Searching by ObjectId: ${slugOrId}`);
      note = await collection.findOne({
        _id: new ObjectId(slugOrId),
        isPubliclyPublished: true
      });
      if (note) {
        console.log(`[PUBLIC API] Found note by ID:`, note.title);
        noteId = note._id?.toString() || null;
      }
    }

    if (!note || !noteId) {
      console.log(`[PUBLIC API] Note not found for slug/id: ${slugOrId}`);
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

    // Get the full note with content using the same adapter as getNote endpoint
    const includeContentHeader = req.headers.get("include-content");
    const includeContent = includeContentHeader !== null ? includeContentHeader === "true" : true;
    const contentPathHeader = req.headers.get("content-path");
    const contentPath = contentPathHeader || note.contentPath || "";

    console.log(`[PUBLIC API] Fetching note content (includeContent: ${includeContent})`);
    const noteWithContent = await adapterForGetNote({ 
      id: noteId, 
      includeContent, 
      contentPath 
    }) as INoteWithContent;

    console.log(`[PUBLIC API] Note fetched:`, {
      id: noteWithContent.id,
      title: noteWithContent.title,
      hasContent: !!noteWithContent.content,
      contentType: typeof noteWithContent.content,
      contentLength: noteWithContent.content?.length || 0,
      contentPath: noteWithContent.contentPath,
    });

    // Return safe fields for public consumption (exclude sensitive user data)
    const safeNote = {
      id: noteWithContent.id,
      title: noteWithContent.title,
      content: noteWithContent.content,
      contentPath: noteWithContent.contentPath,
      commitSha: noteWithContent.commitSha,
      icon: noteWithContent.icon,
      coverUrl: noteWithContent.coverUrl,
      createdAt: noteWithContent.createdAt,
      updatedAt: noteWithContent.updatedAt,
      publicSlug: noteWithContent.publicSlug,
      publicPublishedAt: noteWithContent.publicPublishedAt,
      children: noteWithContent.children || [],
      // Exclude: userId, userEmail, sharedWith, etc.
    };

    return NextResponse.json(safeNote, { status: 200 });
  } catch (error) {
    console.error("Error fetching public note:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

