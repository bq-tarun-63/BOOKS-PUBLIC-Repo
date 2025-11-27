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
    const { workAreaId, memberEmails, role } = body;

    // Validate required fields
    if (!workAreaId || !memberEmails) {
      return NextResponse.json({ 
        error: "workAreaId and memberEmails are required" 
      }, { status: 400 });
    }

    // Validate memberEmails is an array
    if (!Array.isArray(memberEmails) || memberEmails.length === 0) {
      return NextResponse.json({ 
        error: "memberEmails must be a non-empty array" 
      }, { status: 400 });
    }

    // Validate role if provided
    if (role && !["owner", "member"].includes(role)) {
      return NextResponse.json({ 
        error: "role must be either 'owner' or 'member'" 
      }, { status: 400 });
    }

    const workArea = await WorkAreaService.addPeopleToWorkArea({
      workAreaId,
      memberEmails,
      currentUserId: String(user._id),
      role: role || "member",
    });

    // Format work area to include id field
    const formattedWorkArea = {
      ...workArea,
      id: String(workArea._id),
      _id: String(workArea._id),
    };

    return NextResponse.json({
      message: "People added to workarea successfully",
      workArea: formattedWorkArea,
    }, { status: 200 });
  } catch (error) {
    console.error("Error adding people to workarea:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ 
      message: errorMessage,
      error: errorMessage
    }, { status: 500 });
  }
}

