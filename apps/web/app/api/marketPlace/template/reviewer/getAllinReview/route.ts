import { NextResponse } from "next/server";
import { MarketplaceTemplateService } from "@/services/marketPlace/marketPlaceTemplate";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const templates = await MarketplaceTemplateService.getTemplatesInReview({
      statuses: ["submitted"],
    });

            const formattedTemplates = templates.map((template) =>
              MarketplaceTemplateService.formatTemplate({ template }),
            );

    return NextResponse.json(
      {
        message: "Templates in review retrieved successfully",
        templates: formattedTemplates,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching templates in review:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        message: errorMessage,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}

