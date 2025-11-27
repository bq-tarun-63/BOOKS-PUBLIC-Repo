import { NextResponse } from "next/server";
import { WorkspaceService } from "@/services/workspaceService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function DELETE(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, session } = auth;
    const { workspaceId } = await req.json();
    const workspace = await WorkspaceService.deleteWorkspace({
      workspaceId,
      currentUserId: String(user?.id || user?._id),
    });
    return NextResponse.json({message:"Workspace deleted successfully",workspace:workspace},{status:200});
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return NextResponse.json({message:"Internal server error",error:error},{status:500});
  }
}
