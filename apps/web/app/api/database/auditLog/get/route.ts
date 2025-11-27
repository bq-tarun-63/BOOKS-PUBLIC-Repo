import { type NextRequest, NextResponse } from "next/server";
import { AuditService } from "@/services/auditService";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {    // 3. Get collection ID from params
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ 
        message: "Collection ID is required" 
      }, { status: 400 });
    }

    // 4. Get collection by ID
    const activityLogs = await AuditService.getNoteHistory({ noteId: id });
    return NextResponse.json({
      success: true,
      activityLogs,
      message: "Activity logs retrieved successfully"
    });

  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch activity logs",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}