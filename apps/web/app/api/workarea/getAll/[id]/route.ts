import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { WorkAreaService } from "@/services/workAreaService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, session } = auth;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ 
        error: "workspaceId is required" 
      }, { status: 400 });
    }
    
    // Try to convert to ObjectId, but also query by string in case it's stored as string
    let workspaceObjectId: ObjectId;
    try {
      workspaceObjectId = new ObjectId(String(id));
    } catch (error) {
      return NextResponse.json({ 
        error: "Invalid workspaceId format" 
      }, { status: 400 });
    }

    const workAreas = await WorkAreaService.getAllWorkAreas({
      workspaceId: workspaceObjectId,
    });
    
    console.log("Fetched work areas:", workAreas.length, "for workspaceId:", String(id));

    // Format work areas to include id field
    const formattedWorkAreas = workAreas.map((wa) => ({
      ...wa,
      id: String(wa._id),
      _id: String(wa._id),
    }));

    return NextResponse.json({ workAreas: formattedWorkAreas }, { status: 200 });
  } catch (error) {
    console.error("Error creating workarea:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

