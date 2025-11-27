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

    const { workspaceId, name, icon, allowedDomains, diplayAnalytics, Profiles, HoverCards } = await req.json();
    const workspace = await WorkspaceService.updateWorkspaceDetails({
      workspaceId,
      name,
      icon,
      allowedDomains,
      displayAnalytics: diplayAnalytics,
      profiles: Profiles,
      hoverCards: HoverCards,
      currentUserId: String(user.id || user._id),
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
