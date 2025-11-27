import { NextRequest, NextResponse } from "next/server";
import { TemplateService } from "@/services/templateService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    console.log("Duplicate template route called");
    
    // Get authenticated user with workspace from cookie
    const auth = await getAuthenticatedUser(req, { includeWorkspace: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    const { user, session, workspaceId } = auth;
    

    const body = await req.json();
    const { templateId, target } = body;

    if (!templateId) {
      return NextResponse.json({ message: "templateId is required" }, { status: 400 });
    }

    if (!target || !["private", "public", "restricted"].includes(target)) {
      return NextResponse.json(
        { message: "Invalid target. Expected private, public, or restricted." },
        { status: 400 },
      );
    }
    if (!workspaceId) {
      throw new Error("WorkspaceID is required");
    }
    // Get organization domain from user or email
    let organizationDomain = user.organizationDomain || "";
    if (!organizationDomain && session.user?.email) {
      organizationDomain = session.user?.email.split("@")[1] || "";
    }

    // Validate workspaceId
   

    // Clone the template
    const result = await TemplateService.cloneTemplate({
      templateId,
      userId: String(user.id),
      userEmail: user.email || "",
      userName: user.name || user.email || "",
      workspaceId,
      organizationDomain,
      target: target as "private" | "public" | "restricted",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Template cloned successfully",
        ...result,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error cloning template:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to clone template",
      },
      { status: 500 },
    );
  }
}

