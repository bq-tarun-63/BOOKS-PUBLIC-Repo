import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/services/notificationServices";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { session } = auth;
    if (!session?.user?.email) {
      throw new Error("Email is required");
    }
    const notifications = await NotificationService.getNotificationsForUser({
      userEmail: session.user.email,
    });
    
    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
