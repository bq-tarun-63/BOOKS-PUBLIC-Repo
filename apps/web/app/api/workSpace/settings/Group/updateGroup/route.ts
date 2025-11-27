import { NextResponse } from "next/server";
import { WorkspaceService } from "@/services/workspaceService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const { workspaceId, groupId, name, members } = await req.json();
    
    if (!groupId) {
      return NextResponse.json({ message: "Group ID is required" }, { status: 400 });
    }

    const workspace = await WorkspaceService.updateGroup({
      workspaceId,
      groupId,
      name,
      currentUserId: String(user?.id || user?._id),
      members,
    });
    
    return NextResponse.json({message:"Group updated successfully",group:workspace},{status:200});
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json({message:"Internal server error",error:error},{status:500});
  }
}
