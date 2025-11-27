import { NextResponse } from "next/server";
import slugify from "slugify";
import { WorkspaceService } from "@/services/workspaceService";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, session } = auth;
    const { workspaceId, memberId } = await req.json();
    if (!workspaceId || !memberId) {
      return NextResponse.json({ message: "workspaceId and memberId are required" }, { status: 400 });
    }
    const workspace = await WorkspaceService.removeMemberFromWorkspace({
      workspaceId,
      memberId,
      currentUserId: String(user.id || user._id),
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
