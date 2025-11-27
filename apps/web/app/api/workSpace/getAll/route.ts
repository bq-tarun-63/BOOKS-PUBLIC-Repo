import { NextResponse } from "next/server";
import { OrganizationService } from "@/services/organizationService";
import { WorkspaceService } from "@/services/workspaceService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, session } = auth;
    if (!session?.user?.email) {
      throw new Error("Email is required");
    }
    const domain = session.user.email.split("@")[1];
    const lowerDomain = domain?.toLowerCase() as string;

    const workspaces = await WorkspaceService.getWorkspacesByDomain({ domain: lowerDomain });

    return NextResponse.json({
      message: "Workspaces fetched successfully",
      workspaces: workspaces,
    });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
