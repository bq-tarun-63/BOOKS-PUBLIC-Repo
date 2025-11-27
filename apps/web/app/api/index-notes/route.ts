import { VectorService } from "@/services/vectorService";
import { type NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try {    if (!session?.user?.email) {
      throw new Error("Email is required");
    }
    const adminEmails = process.env.ADMINS ? process.env.ADMINS.split(",") : [];
    
    if (!session.user.email || !adminEmails.includes(session.user.email)) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    // Start indexing in background (don't wait for it to complete)
    const indexPromise = VectorService.indexAllNotes();

    // Return immediately with a success message
    return NextResponse.json(
      {
        message: "Note indexing started",
        status: "processing",
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Error starting note indexing:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
