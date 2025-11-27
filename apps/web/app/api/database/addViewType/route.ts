import { type NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/services/databaseService";
export async function POST(req: NextRequest) {   const body = await req.json();
   const {viewId,viewTypes,typeToAdd=""} = body;
   if(!viewId || !viewTypes){
    return NextResponse.json({message:"viewId and viewType are required"},{status:400});
   }
   if(!["board","table","list","calendar","timeline","forms"].includes(typeToAdd)){
    return NextResponse.json({message:"viewType must be one of board, table, list, calendar, timeline, forms"},{status:400});
   }
   const view = await DatabaseService.addViewType({
    viewId,
    viewTypes,
    addToViewType: typeToAdd,
  });
   return NextResponse.json({message:"View type added successfully",view:view},{status:200});
}