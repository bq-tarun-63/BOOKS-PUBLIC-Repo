import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";
import { MarketplaceService } from "@/services/marketPlace/marketPlaceProfile";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;
   
    // Format work areas to include id field
    const profile = await MarketplaceService.getCreatorProfile({ userId: String(user._id) });
    return NextResponse.json({ profile: profile }, { status: 200 });
  } catch (error) {
    console.error("Error creating workarea:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

