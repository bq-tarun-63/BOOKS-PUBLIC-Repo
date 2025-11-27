import { NextResponse } from "next/server";

export async function GET() {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  return NextResponse.json({
    hasSecret: !!secret,
    secretLength: secret?.length || 0,
    secretPrefix: secret ? secret.substring(0, 10) + "..." : "none",
  });
}


