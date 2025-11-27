import { OrganizationService } from "@/services/organizationService";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, session } = auth;
    if (!session?.user?.email) {
      throw new Error("Email is required");

    }
    // ✅ Extract domain from logged-in user's email
    const emailDomain = session.user.email.split("@")[1] as string;
    const name = session.user.name || "";
    // ✅ Create organization
    const org = await OrganizationService.createOrganization({
      name,
      allowedDomains: emailDomain,
      ownerId: String(user._id),
    });

    return NextResponse.json({ message: "Organization created", org }, { status: 201 });

  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

