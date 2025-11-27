import { DatabaseService } from "@/services/databaseService";
import { type NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {const body = await req.json();
  const { viewId, title } = body;

  if (!viewId) {
    return NextResponse.json(
      {
        message: "viewId is required",
      },
      { status: 400 },
    );
  }
  if (!title) {
    return NextResponse.json(
      { message: "propertyId s required" },
      { status: 400 },
    );
  }
  try {
    const result = await DatabaseService.updateViewName({ viewId, title });
    return NextResponse.json(
      {
        message: "View name updated successfully",
        view: result,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({
        message: "Failed to update view name",
        error: error instanceof Error ? error.message : "Unknown error",
      }, { status: 500 }
    );
  }
}
