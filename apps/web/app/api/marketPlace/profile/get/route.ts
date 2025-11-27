import { NextResponse } from "next/server";
import { MarketplaceService } from "@/services/marketPlace/marketPlaceProfile";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const handleParam = url.searchParams.get("handle");

    let creator;

    if (handleParam) {
      // Fetch by handle (public profile)
      creator = await MarketplaceService.getCreatorByHandle({ handle: handleParam });
    } else {
      // Fetch by authenticated user's ID (own profile)
      const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: false });
      if (isAuthError(auth)) {
        return NextResponse.json({ message: auth.error }, { status: auth.status });
      }
      const { user } = auth;

      creator = await MarketplaceService.getCreatorByUserId({ userId: String(user._id) });
    }

    if (!creator) {
      return NextResponse.json(
        {
          error: "Creator profile not found",
        },
        { status: 404 }
      );
    }

    // Format response
    const formattedCreator = MarketplaceService.formatCreator({ creator });

    return NextResponse.json(
      {
        message: "Creator profile retrieved successfully",
        creator: formattedCreator,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching creator profile:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        message: errorMessage,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

