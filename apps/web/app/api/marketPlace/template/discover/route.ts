import { NextResponse } from "next/server";
import { MarketplaceTemplateService } from "@/services/marketPlace/marketPlaceTemplate";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function GET(req: Request) {
  try {
    // Optional auth - marketplace discovery can be public
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: false });
    
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") || "approved"; // Default to approved
    const search = url.searchParams.get("search") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");

    const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;

    // Get all approved/published templates (not filtered by creator)
    const templates = await MarketplaceTemplateService.getPublishedTemplates({
      status: statusParam as "approved" | "published",
      search,
      category,
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
        page,
        limit,
        total: formattedTemplates.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching marketplace templates:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        message: errorMessage,
        error: errorMessage,
        templates: [],
      },
      { status: 500 },
    );
  }
}

