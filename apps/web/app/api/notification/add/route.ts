import { NextRequest, NextResponse } from "next/server";
import { addNotification } from "@/services/notificationServices";
const SECRET_KEY = process.env.NEXT_PUBLIC_CJS_TOKEN;
import CryptoJS from "crypto-js";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const {
      notificationId = "",
      noteId = "",
      noteTitle = "",
      workspaceId,
      message = "",
      type,
      sentTo = [],
    } = await req.json();
    const auth = await getAuthenticatedUser(undefined, { createUserIfNotFound: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const notification = await addNotification({
      notificationId,
      workspaceId,
      type,
      message,
      createdBy: {
        userId: String(user._id),
        userName: user.name || "",
        userEmail: user.email || "",
      },
      noteId,
      noteTitle,
      recipients: sentTo,
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
