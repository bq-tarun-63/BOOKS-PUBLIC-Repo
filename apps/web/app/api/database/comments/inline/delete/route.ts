import { type NextRequest, NextResponse } from "next/server";
import { inlineCommentService } from "@/services/commentService";
export async function POST(req: NextRequest) {   const body = await req.json();
   const {chatId} = body;
   if( !chatId){
    return NextResponse.json({message:"chatId is required"},{status:400});
   }
   const comment = await inlineCommentService.deleteChat({ chatId });
   return NextResponse.json({message:"Comment added successfully",comment:comment});
}
