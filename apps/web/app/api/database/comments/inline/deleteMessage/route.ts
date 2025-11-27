import { type NextRequest, NextResponse } from "next/server";
import { inlineCommentService } from "@/services/commentService";
export async function DELETE(req: NextRequest) {   const body = await req.json();
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
