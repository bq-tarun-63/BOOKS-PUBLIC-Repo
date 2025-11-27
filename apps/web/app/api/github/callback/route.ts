import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";
import { GitHubIntegrationService } from "@/services/githubIntegrationService";

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get("github_oauth_state")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    const errorRedirect = NextResponse.redirect(
      new URL("/settings?tab=integrations&github=error", req.nextUrl.origin)
    );
    errorRedirect.cookies.delete("github_oauth_state");
    return errorRedirect;
  }

  try {
    const callbackUrl =
      process.env.GITHUB_OAUTH_CALLBACK_URL || `${req.nextUrl.origin}/api/github/callback`;
    const tokenResponse = await GitHubIntegrationService.startOAuth(code, callbackUrl);
    await GitHubIntegrationService.upsertConnection({
      userId: String(auth.user._id),
      tokenResponse,
      redirectUri: callbackUrl,
    });

    const installUrl = process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL;
    const redirectParam = req.nextUrl.searchParams.get("redirect");
    let destination: URL;

    if (installUrl) {
      destination = new URL(installUrl);
    } else {
      const fallback = redirectParam || "/settings?tab=integrations&github=success";
      destination = new URL(fallback, req.nextUrl.origin);
    }

    const successRedirect = NextResponse.redirect(destination);
    successRedirect.cookies.delete("github_oauth_state");
    return successRedirect;
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    const failureRedirect = NextResponse.redirect(
      new URL("/settings?tab=integrations&github=error", req.nextUrl.origin)
    );
    failureRedirect.cookies.delete("github_oauth_state");
    return failureRedirect;
  }
}

