import { type NextRequest, NextResponse } from "next/server";
import { inlineCommentService } from "@/services/commentService";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {   const { id  } = await params;
   if(!id){
    return NextResponse.json({message:"chatId is required"},{status:400});
   }
   const comment = await inlineCommentService.getAllChatMessages({ chatId: id });
   return NextResponse.json({message:"Comment added successfully",comment:comment});
}
