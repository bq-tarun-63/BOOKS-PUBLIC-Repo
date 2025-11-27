import { type NextRequest, NextResponse } from "next/server";
import { inlineCommentService } from "@/services/commentService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (isAuthError(auth)) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  const { user } = auth;
   const body = await req.json();
   const {chatId,commentId} = body;
   if( !chatId || !commentId){
    return NextResponse.json({message:"chatId and commentId are required"},{status:400});
   }
   const comment = await inlineCommentService.deleteChatMessage({
    chatId,
    commentId,
  });
   return NextResponse.json({message:"Comment added successfully",comment:comment});
}
