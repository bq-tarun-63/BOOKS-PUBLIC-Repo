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

    const body = await req.json();
    const { name, type } = body;
    if (!session?.user?.email) {
      throw new Error("Email is required");
    }
    const orgDomain = session.user.email.split("@")[1];
    const ownerEmail = session.user.email;
    if (!name || !orgDomain) {
      return NextResponse.json({ error: "Name and orgDomain are required" }, { status: 400 });
    }
    const ownerId = new ObjectId(user._id);
    // Generate slug from name
    const slug = slugify(name, { lower: true, strict: true });
  


    const workspace = await WorkspaceService.createWorkspace({
      name,
      slug,
      orgDomain: orgDomain.toLowerCase(),
       ownerId,
      ownerEmail,
      user,
      type,
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
