import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";
import { GitHubIntegrationService } from "@/services/githubIntegrationService";

export async function GET() {
  const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
  if (isAuthError(auth)) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    const connection = await GitHubIntegrationService.getConnectionByUserId(String(auth.user._id));
    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      githubLogin: connection.githubLogin,
      githubAvatarUrl: connection.githubAvatarUrl,
      installations: (connection.installations || []).map((installation) => ({
        id: installation.id,
        accountId: installation.accountId,
        accountLogin: installation.accountLogin,
        repositorySelection: installation.repositorySelection,
        targetType: installation.targetType,
        suspendedAt: installation.suspendedAt,
      })),
      updatedAt: connection.updatedAt,
      createdAt: connection.createdAt,
    });
  } catch (error) {
    console.error("Failed to fetch GitHub connection status:", error);
    return NextResponse.json({ message: "Failed to fetch GitHub connection status" }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
  if (isAuthError(auth)) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    await GitHubIntegrationService.deleteConnection(String(auth.user._id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to disconnect GitHub:", error);
    return NextResponse.json({ message: "Failed to disconnect GitHub" }, { status: 500 });
  }
}

