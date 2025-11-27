import { type NextRequest, NextResponse } from "next/server";
import { DatabaseSettingService } from "@/services/databaseSettingService";
import type { IPropertyVisibility } from "@/models/types/ViewTypes";
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
    const { viewTypeId, propertyVisibility } = body;

    // 4. Validate required fields
    if (!viewTypeId) {
      return NextResponse.json(
        { message: "viewTypeId is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(propertyVisibility)) {
      return NextResponse.json(
        { message: "propertyVisibility must be an array" },
        { status: 400 }
      );
    }

    // 6. Update property visibility
    const result = await DatabaseSettingService.updatePropertyVisibility({
      viewTypeId,
      propertyVisibility: propertyVisibility as IPropertyVisibility[],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Property visibility updated successfully",
        viewType: result.viewType,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating property visibility:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update property visibility",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

