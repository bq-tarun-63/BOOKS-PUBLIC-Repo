import { DatabaseService } from "@/services/databaseService";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    // Parse request body
    const body = await req.json();
    const { viewId } = body;
    if (!user.id ) {
      throw new Error("User ID is required");
    }
    // 4. Validate required fields

    // 5. Validate viewsType if provided
    //6. Delete view
    try {
      const view = await DatabaseService.deleteView({
        viewId,
        userId: user.id,
        userEmail: user.email || "",
        userName: user.name || "Unknown User",
      });

      return NextResponse.json({
        success: true,
        message: `View '${viewId}' deleted successfully`
      }, { status: 201 });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          return NextResponse.json({ 
            message: error.message 
          }, { status: 400 });
        }
        if (error.message === "Failed to create view") {
          return NextResponse.json({ 
            message: "Failed to create view" 
          }, { status: 500 });
        }
        if (error.message === "Failed to retrieve created view") {
          return NextResponse.json({ 
            message: "Failed to retrieve created view" 
          }, { status: 500 });
        }
      }
      throw error;
    }

  } catch (error) {
    console.error("Error creating view:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create view",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
