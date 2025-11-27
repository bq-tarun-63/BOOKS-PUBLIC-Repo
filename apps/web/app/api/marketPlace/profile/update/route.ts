import { NextResponse } from "next/server";
import { MarketplaceService } from "@/services/marketPlace/marketPlaceProfile";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function PUT(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    // Parse request body
    const body = await req.json();
    const {
      displayName,
      handle,
      bio,
      profilePicture,
      coverPhoto,
      allowEmailContact,
      emailToContact,
      socialLinks,
    } = body;

    // Update creator profile (only provided fields will be updated)
    const creator = await MarketplaceService.updateCreatorProfile({
      userId: String(user._id),
      displayName,
      handle,
      bio,
      profilePicture,
      coverPhoto,
      allowEmailContact,
      emailToContact,
      socialLinks,
    });

    // Format response
    const formattedCreator = MarketplaceService.formatCreator({ creator });

    return NextResponse.json(
      {
        message: "Creator profile updated successfully",
        creator: formattedCreator,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating creator profile:", error);
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

