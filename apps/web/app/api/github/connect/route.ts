import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

const githubClientId = process.env.GITHUB_CLIENT_ID || "";
const defaultScopes = process.env.GITHUB_APP_DEFAULT_SCOPES || "repo,user:email";

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!githubClientId) {
    return NextResponse.json({ error: "GitHub client ID not configured" }, { status: 500 });
  }

  const state = crypto.randomBytes(24).toString("hex");
  const origin = req.nextUrl.origin;
  const callbackUrl = process.env.GITHUB_OAUTH_CALLBACK_URL || `${origin}/api/github/callback`;
  const redirect = new URL("https://github.com/login/oauth/authorize");
  redirect.searchParams.set("client_id", githubClientId);
  redirect.searchParams.set("redirect_uri", callbackUrl);
  redirect.searchParams.set("scope", defaultScopes);
  redirect.searchParams.set("state", state);
  redirect.searchParams.set("allow_signup", "true");

  const response = NextResponse.redirect(redirect.toString());
  response.cookies.set({
    name: "github_oauth_state",
    value: state,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}

