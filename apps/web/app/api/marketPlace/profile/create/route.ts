import { NextResponse } from "next/server";
import { MarketplaceService } from "@/services/marketPlace/marketPlaceProfile";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, session } = auth;

    // Parse request body
    const body = await req.json();
    const {
      displayName,
      handle,
      bio,
      profilePicture,
      coverPhoto,
      allowEmailContact,
      emailToContact="",
      socialLinks,
    } = body;

    // Validate required fields
    if (!displayName || !handle) {
      return NextResponse.json(
        {
          error: "displayName and handle are required",
        },
        { status: 400 }
      );
    }

    if (allowEmailContact && !emailToContact) {
      return NextResponse.json(
        {
          error: "emailToContact is required",
        },
        { status: 400 }
      );
    }

    // Create creator profile
    const creator = await MarketplaceService.createCreatorProfile({
      userId: String(user._id),
      userEmail: session.user?.email || "",
      displayName,
      handle,
      bio,
      profilePicture,
      coverPhoto,
      allowEmailContact: allowEmailContact ?? true,
      emailToContact,
      socialLinks,
    });

    // Format response
            const formattedCreator = MarketplaceService.formatCreator({ creator });

    return NextResponse.json(
      {
        message: "Creator profile created successfully",
        creator: formattedCreator,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating creator profile:", error);
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

