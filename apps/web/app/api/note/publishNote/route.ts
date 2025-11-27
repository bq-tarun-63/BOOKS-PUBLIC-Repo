// import { type NextRequest, NextResponse } from "next/server";
// import { NoteService } from "@/services/noteService";
// import { canPublishNote } from "@/utils/CheckNoteAccess/publishNote/checkAccess";
// import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
// import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

// export async function POST(req: NextRequest) {
//   try {
//     const auth = await getAuthenticatedUser();
//     if (isAuthError(auth)) {
//       return NextResponse.json({ message: auth.error }, { status: auth.status });
//     }
//     const { user } = auth;
//     const body = await req.json();
//     const { id: originalNoteId } = body;
//     if (!originalNoteId || typeof originalNoteId !== "string") {
//       return NextResponse.json({ message: "Note ID is required" }, { status: 400 });
//     }
//     const note = await adapterForGetNote(originalNoteId, false);
//     if (!note) {
//       return NextResponse.json({ message: "Note not found" }, { status: 404 });
//     }
//     const hasAccess = canPublishNote({ note, user });
//     if (!hasAccess) {
//       return NextResponse.json({ message: "Forbidden: You do not have permission to publish this note." }, { status: 403 });
//     }
//     const result = await NoteService.createOrUpdatePublishedNote({ originalNoteId, originalNoteObj: note }); // pass note object
//     return NextResponse.json(result, { status: 200 });
//   } catch (error) {
//     console.error("Error publishing note:", error);
//     return NextResponse.json({ message: "Server error" }, { status: 500 });
//   }
// }
