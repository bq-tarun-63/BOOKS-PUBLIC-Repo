import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";
import { GitHubIntegrationService } from "@/services/githubIntegrationService";

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
  if (isAuthError(auth)) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  const searchParams = req.nextUrl.searchParams;
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const state = (searchParams.get("state") as "open" | "closed" | "all") || "open";
  const perPage = parseInt(searchParams.get("per_page") || "30", 10);
  const installationId = searchParams.get("installation_id")
    ? parseInt(searchParams.get("installation_id")!, 10)
    : undefined;

  if (!owner || !repo) {
    return NextResponse.json({ message: "owner and repo are required" }, { status: 400 });
  }

  try {
    const prs = await GitHubIntegrationService.listPullRequests({
      userId: String(auth.user._id),
      owner,
      repo,
      installationId,
      state,
      perPage,
    });

    return NextResponse.json({ prs });
  } catch (error) {
    console.error("Failed to fetch pull requests:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch pull requests" },
      { status: 500 }
    );
  }
}


