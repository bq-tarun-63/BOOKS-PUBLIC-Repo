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

    const body = await req.json();
    const { membersEmail, workspaceId } = body;
   
    if (!membersEmail || !workspaceId) {
      return NextResponse.json({ error: "Name and orgDomain are required" }, { status: 400 });
    }
    const workspace = await WorkspaceService.addMemberToWorkspace({
      workspaceId,
      role: "member",
      membersEmail,
    });
  


  

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
