import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/services/notificationServices";
export async function POST(req: NextRequest) {
  try {    if (!session?.user?.email) {
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
