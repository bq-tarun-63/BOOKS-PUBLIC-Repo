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
   const {viewId,viewTypeToDelete} = body;
   if(!viewId || !viewTypeToDelete){
    return NextResponse.json({message:"viewId and viewTypeToDelete are required"},{status:400});
   }
   const view = await DatabaseService.deleteViewType({ viewId, viewTypeId: viewTypeToDelete });
   return NextResponse.json({message:"View type deleted successfully",view:view},{status:200});
}