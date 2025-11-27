import { DatabaseService } from "@/services/databaseService";
import { type NextRequest, NextResponse } from "next/server";
import type { ViewTypeWithIconAndTitle } from "@/models/types/VeiwDatabase";
import { ObjectId } from "mongodb";
export async function POST(req: NextRequest) {
  try {    if (!workspaceId) {
      return NextResponse.json({ message: "Workspace ID is required" }, { status: 400 });
    }
    
    // Parse request body
    const body = await req.json();
    const { title="", description="", viewsType=[{_id:new ObjectId(), viewType: "board", icon: "layout-grid", title: "Board" }],noteId,isSprint=false } = body;
    try {
      const view = await DatabaseService.createView({
        viewData: {
          workspaceId,
          title: title.trim(),
          description: description?.trim() || "",
          createdBy: {
            userId: String(user.id),
            userName: user.name || user.email || "",
            userEmail: user.email || "",
          },
          viewsType: viewsType as ViewTypeWithIconAndTitle[],
        },
        noteId,
        isSprint,
      });

      return NextResponse.json({
        success: true,
        view: {
          _id: view._id,
          title: view.title,
          createdBy: view.createdBy,
          createdAt: view.createdAt,
          updatedAt: view.updatedAt,
          viewsType: view.viewsType
        },
        message: `View '${title}' created successfully`
      }, { status: 201 });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          return NextResponse.json({ 
            message: error.message 
          }, { status: 400 });
        }
        if (error.message === "Failed to create view") {
          return NextResponse.json({ 
            message: "Failed to create view" 
          }, { status: 500 });
        }
        if (error.message === "Failed to retrieve created view") {
          return NextResponse.json({ 
            message: "Failed to retrieve created view" 
          }, { status: 500 });
        }
      }
      throw error;
    }

  } catch (error) {
    console.error("Error creating view:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create view",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
