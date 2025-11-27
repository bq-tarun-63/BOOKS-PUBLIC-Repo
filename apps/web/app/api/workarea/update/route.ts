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
    const { workAreaId, workspaceId, name, description, icon, accessLevel } = body;
    
    if (!workAreaId || !workspaceId) {
      return NextResponse.json({ 
        error: "workAreaId and workspaceId are required" 
      }, { status: 400 });
    }
    
    const workAreaObjectId = new ObjectId(workAreaId);
    const workspaceObjectId = new ObjectId(workspaceId);
    console.log("Work area object id:", workAreaObjectId);
    console.log("Workspace object id:", workspaceObjectId);
    console.log("Name:", name);
    console.log("Description:", description);
    console.log("Icon:", icon);
    console.log("Access level:", accessLevel);

    // Update work area
    const updatedWorkArea = await WorkAreaService.updateWorkArea({
      workAreaId: workAreaObjectId,
      name,
      description,
      icon,
      accessLevel,
    });

    // Format work area to include id field
    const formattedWorkArea = {
      ...updatedWorkArea,
      id: String(updatedWorkArea._id),
      _id: String(updatedWorkArea._id),
    };

    return NextResponse.json({ workArea: formattedWorkArea }, { status: 200 });
  } catch (error) {
    console.error("Error updating work area:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ 
      error: errorMessage,
      message: errorMessage 
    }, { status: 500 });
  }
}

