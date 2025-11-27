import { type NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/services/databaseService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const body = await req.json();
    const { viewId, viewTypeId, dataSourceId } = body;

    if (!viewId || !viewTypeId || !dataSourceId) {
      return NextResponse.json(
        { message: "viewId, viewTypeId, and dataSourceId are required" },
        { status: 400 }
      );
    }

    const result = await DatabaseService.updateViewDataSource({
      viewId,
      viewTypeId,
      dataSourceId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "View data source updated successfully",
        view: result.view,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating view data source:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update view data source",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

