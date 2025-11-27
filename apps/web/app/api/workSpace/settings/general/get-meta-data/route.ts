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

    const { workspaceId } = await req.json();
    const workspace = await WorkspaceService.getWorkspaceById({ workspaceId });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
