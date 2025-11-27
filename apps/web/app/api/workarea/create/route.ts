import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { WorkAreaService } from "@/services/workAreaService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, session } = auth;

    const body = await req.json();
    const { name, description, icon, workspaceId, accessLevel } = body;
    if (!session?.user?.email) {
      throw new Error("Email is required");
    }
    const orgDomain = session.user.email?.split("@")[1];
    const ownerEmail = session.user.email;
    
    if (!name || !orgDomain || !workspaceId) {
      return NextResponse.json({ 
        error: "Name, orgDomain, and workspaceId are required" 
      }, { status: 400 });
    }
    
    const ownerId = new ObjectId(user._id);
    // Convert workspaceId to ObjectId if it's a string
    const workspaceObjectId = typeof workspaceId === 'string' 
      ? new ObjectId(workspaceId) 
      : (workspaceId as ObjectId);

    const workArea = await WorkAreaService.createWorkArea({
      name,
      description,
      icon,
      workspaceId: workspaceObjectId,
      orgDomain: orgDomain.toLowerCase(),
      ownerId,
      ownerEmail,
      user,
      accessLevel: accessLevel || "open",
    });

    return NextResponse.json(workArea, { status: 201 });
  } catch (error) {
    console.error("Error creating workarea:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

