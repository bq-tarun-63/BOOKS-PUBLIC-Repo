import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";
import { UserService } from "@/services/userService";
import { DatabaseSettingService } from "@/services/databaseSettingService";
import type { IGroup } from "@/models/types/ViewTypes";

export async function POST(req: NextRequest) {
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

    // 3. Parse request body
    const body = await req.json();
    const { viewTypeId, group } = body;

    // 4. Validate required fields
    if (!viewTypeId) {
      return NextResponse.json(
        { message: "viewTypeId is required" },
        { status: 400 }
      );
    }

    // 5. Validate group if provided
    if (group !== null && group !== undefined) {
      if (typeof group !== "object") {
        return NextResponse.json(
          { message: "group must be an object or null" },
          { status: 400 }
        );
      }
      if (!group.propertyId || typeof group.propertyId !== "string") {
        return NextResponse.json(
          {
            message: "group must have a valid propertyId",
          },
          { status: 400 }
        );
      }
      if (
        group.sortDirection &&
        group.sortDirection !== "ascending" &&
        group.sortDirection !== "descending"
      ) {
        return NextResponse.json(
          {
            message: "group.sortDirection must be 'ascending' or 'descending'",
          },
          { status: 400 }
        );
      }
    }

    // 6. Update group
    const result = await DatabaseSettingService.updateGroup(
      viewTypeId,
      group as IGroup | null
    );

    return NextResponse.json(
      {
        success: true,
        message: group ? "Group updated successfully" : "Group removed successfully",
        viewType: result.viewType,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update group",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


