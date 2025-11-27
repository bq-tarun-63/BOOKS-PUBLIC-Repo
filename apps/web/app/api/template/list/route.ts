import { NextRequest, NextResponse } from "next/server";
import { TemplateService } from "@/services/templateService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, { includeWorkspace: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, session, workspaceId: workspaceIdFromCookie } = auth;

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspaceId");
    const global = searchParams.get("global") === "true";

    // Get workspace from cookie if not in query
    let workspaceId = workspaceIdParam || "";
    let organizationDomain = user.organizationDomain || "";

    if (!workspaceId && !global) {
      workspaceId = workspaceIdFromCookie || "";
    }
    if (!session?.user?.email) {
      throw new Error("Email is required");
    }
    // Get organization domain from user email if not set
    if (!organizationDomain && session.user.email) {
      organizationDomain = session.user.email.split("@")[1] || "";
    }

    // Get templates
    const templates = await TemplateService.getAvailableTemplates({
      userId: String(user.id),
      workspaceId: global ? undefined : workspaceId,
      organizationDomain: global ? undefined : organizationDomain,
    });

    // Format response (only return metadata, not full content)
    const formattedTemplates = templates.map((template) => ({
      _id: String(template._id),
      id: String(template._id),
      title: template.title,
      icon: template.icon || "",
      coverUrl: template.coverUrl || null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      workspaceId: template.workspaceId,
      organizationDomain: template.organizationDomain,
      databaseViewId: template.databaseViewId ? String(template.databaseViewId) : undefined,
    }));

    return NextResponse.json(
      {
        success: true,
        templates: formattedTemplates,
        count: formattedTemplates.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch templates",
        templates: [],
      },
      { status: 500 },
    );
  }
}

