import { adapterForCreateNote } from "@/lib/adapter/adapterForCreateNote";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

interface CreateTemplatePayload {
  title?: string;
  icon?: string | null;
  workAreaId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, { includeWorkspace: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, workspaceId } = auth;
    const organizationDomain = user.organizationDomain || "";

    const body = (await req.json().catch(() => ({}))) as CreateTemplatePayload;
    const title =
      typeof body.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : "Untitled template";
    const icon = typeof body.icon === "string" ? body.icon : undefined;
    const workAreaId = body.workAreaId || "";
    const newNoteId = new ObjectId().toString();
    if (!user.id) {
      throw new Error("User ID is required");
    }
    const createdTemplate = await adapterForCreateNote({
      noteId: newNoteId,
      title,
      userId: user.id,
      userEmail: user.email,
      userName: user.name || "",
      parentId: null,
      icon,
      isPublicNote: false,
      isRestrictedPage: false,
      parentNote: undefined,
      organizationDomain: user.organizationDomain || "",
      workspaceId,
      databaseViewId: undefined,
      databaseProperties: undefined,
      databaseNoteId: undefined,
      workAreaId,
      isTemplate: true,
    });

    return NextResponse.json(createdTemplate, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      {
        message: "Failed to create template",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
