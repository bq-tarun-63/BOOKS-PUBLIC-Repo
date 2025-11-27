import { NextResponse } from "next/server";
import { MarketplaceService } from "@/services/marketPlace/marketPlaceProfile";
import { MarketplaceTemplateService } from "@/services/marketPlace/marketPlaceTemplate";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function GET(req: Request) {
  try {
    // Get authenticated user (create if not found)
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    const { user, session } = auth;

    const creator = await MarketplaceService.getCreatorByUserId({ userId: String(user._id) });
    if (!creator || !creator._id) {
      return NextResponse.json(
        { error: "Creator profile not found. Please create a creator profile first." },
        { status: 404 },
      );
    }

    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");

    const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;

    const templates = await MarketplaceTemplateService.getTemplatesForCreator({
      creatorId: String(creator._id),
      status: statusParam,
      search,
      page,
      limit,
    });

                const formattedTemplates = templates.map((template) =>
                  MarketplaceTemplateService.formatTemplate({ template }),
                );

    return NextResponse.json(
      {
        message: "Templates retrieved successfully",
        templates: formattedTemplates,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching templates:", error);
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

