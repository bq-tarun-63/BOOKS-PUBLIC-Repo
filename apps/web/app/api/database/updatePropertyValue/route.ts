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
    const { dataSourceId, viewId, pageId, propertyId, value, workspaceName="" } = body;

    // 4. Validate required fields
    if (!dataSourceId) {
      return NextResponse.json({ 
        message: "dataSourceId is required" 
      }, { status: 400 });
    }

    if (!pageId) {
      return NextResponse.json({ 
        message: "pageId is required" 
      }, { status: 400 });
    }

    if (!propertyId) {
      return NextResponse.json({ 
        message: "propertyId is required" 
      }, { status: 400 });
    }

    if (value === undefined || value === null) {
      return NextResponse.json({ 
        message: "value is required" 
      }, { status: 400 });
    }

    // 5. Update property value
    try {
      const result = await DatabaseService.updatePropertyValue({
        dataSourceId,
        pageId,
        propertyId,
        value,
        currentUser: user,
        workspaceName: workspaceName || "",
        viewId
      });

      return NextResponse.json({
        success: true,
        page: {
          _id: result.page._id,
          title: result.page.title,
          databaseProperties: result.page.databaseProperties,
          updatedAt: result.page.updatedAt
        },
        propertyId: result.propertyId,
        value: result.value,
        updatedAt: result.updatedAt,
        notificationOnAssigned: result.notificationOnAssigned,
        message: `Property '${propertyId}' updated successfully for page '${result.page.title}'`
      }, { status: 200 });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Data source not found") {
          return NextResponse.json({ 
            message: "Data source not found" 
          }, { status: 404 });
        }
        if (error.message === "Property not found in database source") {
          return NextResponse.json({ 
            message: "Property not found" 
          }, { status: 404 });
        }
        if (error.message === "Page not found in this data source") {
          return NextResponse.json({ 
            message: "Page not found in this data source" 
          }, { status: 404 });
        }
        if (error.message === "Failed to update property value") {
          return NextResponse.json({ 
            message: "Failed to update property value" 
          }, { status: 500 });
        }
        if (error.message === "Formula properties are read-only") {
          return NextResponse.json({
            message: error.message
          }, { status: 400 });
        }
      }
      throw error;
    }

  } catch (error) {
    console.error("Error updating property value:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update property value",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
