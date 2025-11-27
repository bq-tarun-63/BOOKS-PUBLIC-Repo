import { type NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/services/databaseService";
export async function POST(req: NextRequest) {   const body = await req.json();
   const {text, noteId, mediaMetaData} = body;
   if(!user?._id || !user?.name || !user?.email || !text || !noteId){
    return NextResponse.json({message:"commenterId, user?.name, user?.email, text and noteId are required"},{status:400});
   }
   const comment = await DatabaseService.addComment({ 
     commenterId: String(user?._id), 
     commenterName: user?.name, 
     commenterEmail: user?.email, 
     text, 
     noteId,
     mediaMetaData: mediaMetaData || undefined
   });
   return NextResponse.json({message:"Comment added successfully",comment:comment});
}
