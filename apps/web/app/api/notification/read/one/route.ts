import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/services/notificationServices";
export async function POST(req: NextRequest) {
  try {
    const {
      notificationId = "",
    } = await req.json();    if (!session?.user?.email) {
      throw new Error("Email is required");
    }
    const userEmail = session.user.email;
   
    // if (!workspaceId || !workspaceName || !type || !message) {
    //   return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    // }

    const notification = await NotificationService.deleteNotification({
      notificationId,
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
 