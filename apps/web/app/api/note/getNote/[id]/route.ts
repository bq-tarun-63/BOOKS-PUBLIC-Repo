import { type NextRequest, NextResponse } from "next/server";
import { adapterForGetNote, type INoteWithContent } from "@/public-api-services/public-services";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log("Getting note with ID:----------------------->>", id);

    const includeContentHeader = req.headers.get("include-content");
    const includeContent = includeContentHeader !== null ? includeContentHeader === "true" : true;
    const contentPathHeader = req.headers.get("content-path");
    const contentPath = contentPathHeader || "";
    
    if (!id) {
      return NextResponse.json({ message: "Invalid note ID" }, { status: 400 });
    }
    
    // Get the note (no user auth or access checks on public server)
    const note = await adapterForGetNote({ id, includeContent, contentPath }) as INoteWithContent;

    return NextResponse.json(note, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching note:", error);

    if (error instanceof Error) {
      if (error.message === "Note not found" || error.message === "Invalid note ID") {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
    }

    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
