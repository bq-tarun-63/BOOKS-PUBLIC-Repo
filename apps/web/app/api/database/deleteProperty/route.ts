import { DatabaseService } from "@/services/databaseService";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    // Parse request body
    const body = await req.json();
    const { dataSourceId, propertyId } = body;

    // 4. Validate required fields
    if (!dataSourceId) {
      return NextResponse.json({ 
        message: "dataSourceId is required" 
      }, { status: 400 });
    }

    if (!propertyId) {
      return NextResponse.json({ 
        message: "propertyId is required" 
      }, { status: 400 });
    }
    if (!user.id) {
      throw new Error("User ID, email, and name are required");
    }

    // 5. Delete property
    try {
      const result = await DatabaseService.deleteProperty({
        dataSourceId,
        propertyId,
        userId: user.id,
        userEmail: user.email || "",
        userName: user.name || "Unknown User",
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
        notes: result.notes,
        message: `Property deleted successfully`
      }, { status: 200 });

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
    console.error("Error deleting property:", error);
    if (error instanceof Error) {
      if (error.message === "Data source not found") {
        return NextResponse.json({ 
          message: "Data source not found" 
        }, { status: 404 });
      }
      if (error.message === "Property not found in data source") {
        return NextResponse.json({ 
          message: "Property not found" 
        }, { status: 404 });
      }
      if (error.message === "Failed to delete property") {
        return NextResponse.json({ 
          message: "Failed to delete property" 
        }, { status: 500 });
      }
    }
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to delete property",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
