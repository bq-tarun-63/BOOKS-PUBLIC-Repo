import { UserService } from "@/services/userService";
import type { NextRequest } from "next/server";

export async function getCurrentUser(req: NextRequest) {
  try {
    const userEmail = req.headers.get("x-user-email");
    const userName = req.headers.get("x-user-name");
    const userImage = req.headers.get("x-user-image");

    if (userEmail) {
      const user = await UserService.findUserByEmail({ email: userEmail });

      if (!user) {
        return await UserService.createUser({
          userData: {
            email: userEmail,
            name: userName || undefined,
            image: userImage || undefined,
          },
        });
      }

      return user;
    }

    return null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
