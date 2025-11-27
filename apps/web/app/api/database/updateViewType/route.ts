import { type NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/services/databaseService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (isAuthError(auth)) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  const { user } = auth;

  const body = await req.json();
  const {viewId,viewTypeId,icon="",title,viewType,formIcon,formCoverImage,formTitle,formDescription,isPublicForm,formAnonymousResponses,formAccessToSubmission} = body;
  if(!viewId || !viewTypeId || !title){
    return NextResponse.json({message:"viewId, viewTypeId and title are required"},{status:400});
  }
  const view = await DatabaseService.updateViewType({
    viewId,
    viewTypeId,
    icon,
    title,
    newViewType: viewType,
    formIcon,
    formCoverImage,
    formTitle,
    formDescription,
    isPublicForm,
    formAnonymousResponses,
    formAccessToSubmission,
  });
  return NextResponse.json({message:"View type updated successfully",view:view},{status:200});
}