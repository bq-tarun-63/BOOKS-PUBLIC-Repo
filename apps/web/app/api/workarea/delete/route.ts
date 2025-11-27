import { NextResponse } from "next/server";
import { WorkAreaService } from "@/services/workAreaService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function DELETE(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const { workAreaId } = await req.json();

    if (!workAreaId) {
      return NextResponse.json({ 
        error: "workAreaId is required" 
      }, { status: 400 });
    }

    const result = await WorkAreaService.deleteWorkArea({
      workAreaId,
      currentUserId: String(user.id || user._id)
    });

    return NextResponse.json({
      message: "WorkArea deleted successfully",
      result
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting workarea:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}