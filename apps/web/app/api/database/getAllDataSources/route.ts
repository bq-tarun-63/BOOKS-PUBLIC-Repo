import { DatabaseService } from "@/services/databaseService";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function GET(req: NextRequest) {
  console.log("GET /api/database/getAllDataSources called");
  try {
    const auth = await getAuthenticatedUser(req, { includeWorkspace: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, workspaceId } = auth;

    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Workspace ID is required",
        },
        { status: 400 }
      );
    }

    // 4. Get all data sources for the workspace
    const dataSources = await DatabaseService.getAllDataSourcesByWorkspace({ workspaceId });

    return NextResponse.json({
      success: true,
      dataSources,
      message: "Data sources retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching data sources:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch data sources",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

