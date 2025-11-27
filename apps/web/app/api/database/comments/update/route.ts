import { type NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/services/databaseService";
export async function POST(req: NextRequest) {   const body = await req.json();
   const {commentId,text,noteId} = body;
   if(!commentId  || !text || !noteId){
    return NextResponse.json({message:"commentId,text and noteId are required"},{status:400});
   }
   const comment = await DatabaseService.updateComment({ commentId, text, noteId });
   return NextResponse.json({message:"Comment added successfully",comment:comment},{status:200});
}
