import { type NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/services/databaseService";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    // Parse request body
    const body = await req.json();
    // i all get{/
/*{
    "68da4c5e4dc75018c7bf227a": [
        "prop_68da4c5e4dc75018c7bf2279",
        "prop_68da7b3ee8baf83a756c9154",
        "prop_68da7b41e8baf83a756c9155",
        "prop_68da7cc3e8baf83a756c9159",
        "prop_68da7b43e8baf83a756c9156",
        "prop_68da7d87e8baf83a756c915a",
        "prop_68da831bbb3136d5b5888b95"
    ]
}    
*/

    const { dataSourceId, viewId, order } = body;
    
    // Validate required fields
    if (!dataSourceId) {
      return NextResponse.json({
        message: "dataSourceId is required"
      }, { status: 400 });
    }
    
    if (!order || !Array.isArray(order)) {
      return NextResponse.json({
        message: "order array is required"
      }, { status: 400 });
    }

    if (!user.id) {
      throw new Error("User ID is required");
    }
    // 5. Reorder schema
    try {
        const result = await DatabaseService.reOrderSchema({
          dataSourceId,
          order,
          userId: user.id,
          userEmail: user.email || "",
          userName: user.name || "Unknown User",
          viewId, // Optional for audit purposes
        });
        return NextResponse.json({
            success: true,
            dataSource: {
              _id: result.dataSource._id,
              title: result.dataSource.title,
              properties: result.dataSource.properties,
              settings: result.dataSource.settings,
              workspaceId: result.dataSource.workspaceId,
              isSprint: result.dataSource.isSprint,
              createdAt: result.dataSource.createdAt,
              updatedAt: result.dataSource.updatedAt,
              createdBy: result.dataSource.createdBy,
            },
            message: "Schema reordered successfully"
        }, { status: 200 });
   
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "View not found") {
          return NextResponse.json({ 
            message: "View not found" 
          }, { status: 404 });
        }
        if (error.message === "Property not found in view") {
          return NextResponse.json({ 
            message: "Property not found in view" 
          }, { status: 404 });
        }
        if (error.message.includes("already exists")) {
          return NextResponse.json({ 
            message: error.message 
          }, { status: 400 });
        }
        if (error.message.includes("Property name is required")) {
          return NextResponse.json({ 
            message: error.message 
          }, { status: 400 });
        }
        if (error.message === "Failed to update property name") {
          return NextResponse.json({ 
            message: "Failed to update property name" 
          }, { status: 500 });
        }
      }
      throw error;
    }

  } catch (error) {
    console.error("Error updating property name:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update property name",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
