import { type NextRequest, NextResponse } from "next/server";
import { inlineCommentService } from "@/services/commentService";
export async function POST(req: NextRequest) {   const body = await req.json();
   const {text, noteId, chatId, commentId, mediaMetaData} = body;
   if(!user?._id || !user?.name || !user?.email || !text || !noteId || !chatId){
    return NextResponse.json({message:"commenterId, user?.name, user?.email, text, noteId and chatId are required"},{status:400});
   }
   const comment = await inlineCommentService.addChatMessage({
    chatId,
    commentId,
    commenterName: user?.name,
    commenterEmail: user?.email,
    text,
    noteId,
    mediaMetaData: mediaMetaData || undefined,
  });
   return NextResponse.json({message:"Comment added successfully",comment:comment});
}
