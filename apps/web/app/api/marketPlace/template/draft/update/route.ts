import { NextResponse } from "next/server";
import { MarketplaceService } from "@/services/marketPlace/marketPlaceProfile";
import { MarketplaceTemplateService } from "@/services/marketPlace/marketPlaceTemplate";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    // Get creator profile
    const creator = await MarketplaceService.getCreatorByUserId({ userId: String(user._id) });
    if (!creator) {
      return NextResponse.json(
        {
          error: "Creator profile not found. Please create a creator profile first.",
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      templateId, // Required - ID of the template note
      title,
      templateLink,
      description,
      briefDescription,
      category,
      tags,
      language,
      urlSlug,
      isPaid,
      price,
      currency,
      accessLocking,
      coverImage,
      previewImages,
    } = body;

    // Validate required fields
    if (!templateId) {
      return NextResponse.json(
        {
          error: "templateId is required",
        },
        { status: 400 }
      );
    }

    // Save draft template
    const template = await MarketplaceTemplateService.saveDraft({
      creatorId: String(creator._id),
      templateId,
      templateData: {
        title,
        templateLink,
        description,
        briefDescription,
        category,
        tags,
        language,
        urlSlug,
        isPaid,
        price,
        currency,
        accessLocking,
        coverImage,
        previewImages,
      },
    });

    // Format response
            const formattedTemplate = MarketplaceTemplateService.formatTemplate({ template });

    return NextResponse.json(
      {
        message: "Template draft saved successfully",
        template: formattedTemplate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving template draft:", error);
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

