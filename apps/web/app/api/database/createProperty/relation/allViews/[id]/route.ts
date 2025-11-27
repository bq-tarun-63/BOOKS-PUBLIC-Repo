import { DatabaseService } from "@/services/databaseService";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, session } = auth;

    // Parse params
    const { id } = await params;
    if (!session?.user?.email) {
      throw new Error("Email is required");
    }
      (session.user.email ? session.user.email.split("@")[1] : undefined);
    const workspaceId = id === "all" ? "" : String(id);

    // 4. Get all views
    const views = await DatabaseService.getAllViews({ workspaceId });

    return NextResponse.json({
      success: true,
      views: views,
      count: views.length,
      message: `Found ${views.length} view(s)`
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching views:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch views",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}