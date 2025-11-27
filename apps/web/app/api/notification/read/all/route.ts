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
 