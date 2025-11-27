import { DatabaseService } from "@/services/databaseService";
import { type NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  try {    // 3. Get viewId from query parameters
    const { searchParams } = new URL(req.url);
    const viewId = searchParams.get("viewId");

    if (!viewId) {
      return NextResponse.json({ 
        error: "viewId is required" 
      }, { status: 400 });
    }

    // 4. Get all notes for this view
    const notes = await DatabaseService.getAllNotesOfView({ viewId });

    return NextResponse.json({
      success: true,
      notes: notes,
      count: notes.length,
      message: `Found ${notes.length} note(s) in view`
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching notes of view:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    if (errorMessage === "View not found") {
      return NextResponse.json({ 
        success: false,
        message: "View not found",
        error: errorMessage
      }, { status: 404 });
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch notes",
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {    // Parse request body
    const body = await req.json();
    const { viewId } = body;

    if (!viewId) {
      return NextResponse.json({ 
        error: "viewId is required" 
      }, { status: 400 });
    }

    // 4. Get all notes for this view
    const notes = await DatabaseService.getAllNotesOfView({ viewId });

    return NextResponse.json({
      success: true,
      notes: notes,
      count: notes.length,
      message: `Found ${notes.length} note(s) in view`
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching notes of view:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    if (errorMessage === "View not found") {
      return NextResponse.json({ 
        success: false,
        message: "View not found",
        error: errorMessage
      }, { status: 404 });
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch notes",
        error: errorMessage
      },
      { status: 500 }
    );
  }
}