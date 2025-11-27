import { NoteService } from "@/services/noteService";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, { includeWorkspace: true });
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user, workspaceId } = auth;

    if (!workspaceId || workspaceId === "") {
      return NextResponse.json({ message: "Workspace not found" }, { status: 404 });
    }
    if (!user.id) {
      throw new Error("User ID is required");
    }
    const recentNotes = await NoteService.getRecentNotes({ userId: user.id, workspaceId });

    return NextResponse.json(recentNotes, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching recent notes:", error);

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
