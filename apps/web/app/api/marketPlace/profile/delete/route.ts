import { NextResponse } from "next/server";
import { MarketplaceService } from "@/services/marketPlace/marketPlaceProfile";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function DELETE(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    // Delete creator profile
    const result = await MarketplaceService.deleteCreatorProfile({ userId: String(user._id) });

    return NextResponse.json(
      {
        message: "Creator profile deleted successfully",
        result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting creator profile:", error);
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

