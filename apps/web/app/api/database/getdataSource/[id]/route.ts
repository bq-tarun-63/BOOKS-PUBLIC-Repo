import { DatabaseService } from "@/services/databaseService";
import { type NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {    // 3. Get collection ID from params
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ 
        message: "Collection ID is required" 
      }, { status: 400 });
    }

    // 4. Get collection by ID
    const collection = await DatabaseService.getDataSourceById({ dataSourceId: id });
    if (!collection) {
      return NextResponse.json({ 
        message: "Collection not found" 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      collection,
      message: "Collection retrieved successfully"
    });

  } catch (error) {
    console.error("Error fetching collection:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch collection",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}