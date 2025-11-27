import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/services/notificationServices";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const {
      notificationId = "",
    } = await req.json();
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { session } = auth;
    if (!session?.user?.email) {
      throw new Error("Email is required");
    }
    const userEmail = session.user.email;
   
    const notification = await NotificationService.deleteAllNotification({
      userEmail,
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("Add notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
 