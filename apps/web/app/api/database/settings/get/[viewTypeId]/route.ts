import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../auth/[...nextauth]/authOptions";
import { UserService } from "@/services/userService";
import { DatabaseSettingService } from "@/services/databaseSettingService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ viewTypeId: string }> }
) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  
    // 2. Get user from database
    const user = await UserService.findUserByEmail({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // 3. Get viewTypeId from params
    const { viewTypeId } = await params;
    if (!viewTypeId) {
      return NextResponse.json(
        { message: "viewTypeId is required" },
        { status: 400 }
      );
    }

    // 4. Get viewType settings from service
    const result = await DatabaseSettingService.getViewTypeById(viewTypeId);

    return NextResponse.json(
      {
        success: true,
        viewType: result.viewType,
        message: "View type settings retrieved successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching view type settings:", error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message === "View type not found") {
        return NextResponse.json(
          {
            success: false,
            message: "View type not found",
          },
          { status: 404 }
        );
      }
      if (error.message === "View type ID is required") {
        return NextResponse.json(
          {
            success: false,
            message: "viewTypeId is required",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch view type settings",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

