import { type NextRequest, NextResponse } from "next/server";
import { inlineCommentService } from "@/services/commentService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (isAuthError(auth)) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  const { user } = auth;
   const body = await req.json();
   const {text,chatId,commentId,noteId} = body;
   if(!user?._id || !user?.name || !user?.email || !text || !chatId){
    return NextResponse.json({message:"commenterId, user?.name, user?.email, text, noteId and chatId are required"},{status:400});
   }
   const comment = await inlineCommentService.updateChatMessage({
    chatId,
    commentId,
    text,
  });
   return NextResponse.json({message:"Comment added successfully",comment:comment});
}
