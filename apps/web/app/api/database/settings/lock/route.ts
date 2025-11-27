import { type NextRequest, NextResponse } from "next/server";
import { DatabaseSettingService } from "@/services/databaseSettingService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    // Parse request body
    const body = await req.json();
    const { viewTypeId, isLocked } = body;

    // 4. Validate required fields
    if (!viewTypeId) {
      return NextResponse.json(
        { message: "viewTypeId is required" },
        { status: 400 }
      );
    }

    // 5. Validate isLocked if provided (must be boolean)
    if (isLocked !== undefined && typeof isLocked !== "boolean") {
      return NextResponse.json(
        { message: "isLocked must be a boolean value" },
        { status: 400 }
      );
    }

    // 6. Toggle lock
    const result = await DatabaseSettingService.toggleLock({
      viewTypeId,
      isLocked,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.isLocked
          ? "View locked successfully"
          : "View unlocked successfully",
        viewType: result.viewType,
        isLocked: result.isLocked,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error toggling lock:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to toggle lock",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

