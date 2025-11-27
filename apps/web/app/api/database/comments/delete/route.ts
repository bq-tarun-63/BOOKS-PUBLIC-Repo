import { type NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/services/databaseService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (isAuthError(auth)) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  const { user } = auth;
   const body = await req.json();
   const {commentId,noteId} = body;
   if(!commentId || !noteId){
    return NextResponse.json({message:"commentId and noteId are required"},{status:400});
   }
   const comment = await DatabaseService.deleteComment({ commentId, noteId });
   return NextResponse.json({message:"Comment added successfully",comment:comment},{status:200});
}
