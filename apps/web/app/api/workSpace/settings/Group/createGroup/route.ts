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

    const { workspaceId, name, members } = await req.json();
    const workspace = await WorkspaceService.createGroup({
      workspaceId,
      name,
      currentUserId: String(user?.id || user?._id),
      members,
    });
    
    return NextResponse.json({message:"Group created successfully",workspace:workspace},{status:200});
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({message:"Internal server error",error:error},{status:500});
  }
}
