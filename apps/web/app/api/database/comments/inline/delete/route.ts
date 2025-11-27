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
   const {chatId} = body;
   if( !chatId){
    return NextResponse.json({message:"chatId is required"},{status:400});
   }
   const comment = await inlineCommentService.deleteChat({ chatId });
   return NextResponse.json({message:"Comment added successfully",comment:comment});
}
