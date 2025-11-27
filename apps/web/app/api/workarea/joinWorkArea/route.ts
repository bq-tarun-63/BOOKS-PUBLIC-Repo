import { NextResponse } from "next/server";
import { WorkAreaService } from "@/services/workAreaService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const body = await req.json();
    const { workAreaId } = body;

    // Validate required fields
    if (!workAreaId) {
      return NextResponse.json({ 
        error: "workAreaId is required" 
      }, { status: 400 });
    }

    const workArea = await WorkAreaService.joinWorkArea({
      workAreaId,
      currentUserId: String(user._id),
    });

    // Format work area to include id field
    const formattedWorkArea = {
      ...workArea,
      id: String(workArea._id),
      _id: String(workArea._id),
    };

    // Determine response message based on access level
    let message = "Joined workarea successfully";
    if (workArea.accessLevel === "closed") {
      message = "Join request submitted successfully";
    }

    return NextResponse.json({
      message,
      workArea: formattedWorkArea,
    }, { status: 200 });
  } catch (error) {
    console.error("Error joining workarea:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ 
      message: errorMessage,
      error: errorMessage
    }, { status: 500 });
  }
}

