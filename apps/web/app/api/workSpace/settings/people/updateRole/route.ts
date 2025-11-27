import { NextResponse } from "next/server";
import { WorkspaceService } from "@/services/workspaceService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, session } = auth;

    const { workspaceId, memberId, role } = await req.json();
   
    const workspace = await WorkspaceService.updateMemberRole({
      workspaceId,
      memberId,
      role,
      currentUserId: String(user.id || user._id),
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
