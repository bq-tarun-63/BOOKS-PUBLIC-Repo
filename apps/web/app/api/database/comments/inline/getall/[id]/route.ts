import { type NextRequest, NextResponse } from "next/server";
import { inlineCommentService } from "@/services/commentService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser();
  if (isAuthError(auth)) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  const { user } = auth;
   const { id  } = await params;
   if(!id){
    return NextResponse.json({message:"chatId is required"},{status:400});
   }
   const comment = await inlineCommentService.getAllChatMessages({ chatId: id });
   return NextResponse.json({message:"Comment added successfully",comment:comment});
}
