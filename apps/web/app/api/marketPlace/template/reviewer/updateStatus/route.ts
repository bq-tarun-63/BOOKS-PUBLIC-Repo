import { NextResponse } from "next/server";
import { MarketplaceTemplateService } from "@/services/marketPlace/marketPlaceTemplate";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function PUT(req: Request) {
  try {
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const body = await req.json();
    const { templateId, status, reviewNotes } = body || {};

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 },
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 },
      );
    }

    const normalizedStatus = String(status).toLowerCase();
    if (normalizedStatus !== "approved" && normalizedStatus !== "rejected") {
      return NextResponse.json(
        { error: "status must be either 'approved' or 'rejected'" },
        { status: 400 },
      );
    }

    const updatedTemplate = await MarketplaceTemplateService.updateTemplateStatus({
      templateId: String(templateId),
      reviewerId: String(user._id),
      status: normalizedStatus as "approved" | "rejected",
      reviewNotes: reviewNotes ? String(reviewNotes) : undefined,
    });

            const formattedTemplate = MarketplaceTemplateService.formatTemplate({ template: updatedTemplate });

    return NextResponse.json(
      {
        message: `Template ${normalizedStatus} successfully`,
        template: formattedTemplate,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating template status:", error);
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

