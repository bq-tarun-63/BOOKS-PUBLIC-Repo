import { NextResponse } from "next/server";
import { WorkAreaService } from "../../../../../../services/workAreaService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const body = await req.json();
    const { workAreaId, groupId, permission } = body;

    // Validate required fields
    if (!workAreaId || !groupId || !permission) {
      return NextResponse.json({ 
        error: "workAreaId, groupId, and permission are required" 
      }, { status: 400 });
    }

    // Validate permission value
    // const validPermissions = ["full", "edit", "comment", "view"];
    // if (!validPermissions.includes(permission)) {
    //   return NextResponse.json({ 
    //     error: `Permission must be one of: ${validPermissions.join(", ")}` 
    //   }, { status: 400 });
    // }

    const workArea = await WorkAreaService.giveGroupAccessToWorkArea({
      workAreaId,
      groupId,
      permission: permission as "full" | "edit" | "comment" | "view",
      currentUserId: String(user._id),
    });

    return NextResponse.json({
      message: "Group access granted successfully",
      workArea: workArea,
    }, { status: 200 });
  } catch (error) {
    console.error("Error granting group access to workarea:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ 
      message: errorMessage 
    }, { status: 500 });
  }
}
