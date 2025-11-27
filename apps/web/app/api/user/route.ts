import clientPromise from "@/lib/mongoDb/mongodb";
import { addMemberToWorkspace } from "@/services/notificationServices";
import { OrganizationService } from "@/services/organizationService";
import { ObjectId } from "bson";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

// Safely parse BETAQUE_WORKSPACE_IDS environment variable
const BETAQUE_WORKSPACE_IDS: string[] = process.env.BETAQUE_WORKSPACE_IDS
  ? process.env.BETAQUE_WORKSPACE_IDS.split(",").filter(Boolean)
  : [];

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json(
        { message: auth.error, authenticated: false },
        { status: auth.status },
      );
    }
    let { user, session } = auth;

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized: Unable to authenticate user", authenticated: false },
        { status: 401 },
      );
    }
    if (!session?.user?.email) {
      throw new Error("Email is required");
    }
    // 3. Extract domain from email - safely handle undefined email
    const emailDomain =
      session.user.email && session.user.email.includes("@")
        ? session.user.email.split("@")[1]?.toLowerCase()
        : undefined;

    /* //make sure if the domain is @betaque thenpush the user to
   the betaque organization MEMBER FIELD
   */
   if(emailDomain === "reventlabs.com"){
    for(const workspaceId of BETAQUE_WORKSPACE_IDS){
    await addMemberToWorkspace({
      workspaceId,
      user: {
        userId: user._id as ObjectId,
        userName: user.name || "",
        userEmail: user.email || "",
      },
      role: "member",
    });
  }
   }
    // 4. Look for matching organization
    let organization: any;
    if (emailDomain) {
      organization = await OrganizationService.findByDomain({ domain: emailDomain });
    }

    const client = await clientPromise();
    const db = client.db();

    if (organization)
      user = { ...user, organizationId: organization._id, organizationDomain: organization.allowedDomains };

    // 5. Attach organization details to user object
    if (organization) {
      db.collection("users").updateOne(
        { _id: new ObjectId(user._id) },
        {
          $set: {
            organizationId: organization._id,
            organizationDomain: organization.allowedDomains,
          },
        },
      );
    } else {
    }

    return NextResponse.json({ ...user, authenticated: true }, { status: 200 });
  } catch (error) {
    console.error("Error in user API:", error);
    return NextResponse.json(
      {
        message: "Server error",
        error: error instanceof Error ? error.message : String(error),
        authenticated: false,
      },
      { status: 500 },
    );
  }
}
