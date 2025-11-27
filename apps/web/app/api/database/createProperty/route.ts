
import { type NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/services/databaseService";
import { ObjectId } from "mongodb";
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
    const { 
      dataSourceId,
      viewId, // Optional for audit purposes
      name, 
      type, 
      options = [],
      linkedDatabaseId,
      syncedPropertyId,
      syncedPropertyName,
      relationLimit = "multiple",
      displayProperties = [],
      twoWayRelation = false,
      githubPrConfig,
    } = body;

    // 4. Validate required fields
    if (!dataSourceId) {
      return NextResponse.json({ 
        message: "dataSourceId is required" 
      }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ 
        message: "Property name is required and must be a non-empty string"
      }, { status: 400 });
    }

    const validTypes = [
      'title',
      'text',
      'select',
      'multi_select',
      'comments',
      'person',
      'date',
      'checkbox',
      'number',
      'status',
      'priority',
      'formula',
      'relation',
      'github_pr',
      'rollup',
      'email',
      'url',
      'phone',
      'file',
    ];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ 
        message: `Property type is required and must be one of: ${validTypes.join(', ')}`
      }, { status: 400 });
    }

    // Validate relation-specific fields
    if (type === "relation") {
      if (!linkedDatabaseId) {
        return NextResponse.json({
          message: "linkedDatabaseId is required for relation properties"
        }, { status: 400 });
      }
      if (relationLimit && !["single", "multiple"].includes(relationLimit)) {
        return NextResponse.json({
          message: "relationLimit must be 'single' or 'multiple'"
        }, { status: 400 });
      }
    }

    if (!user.email || !user.name || !user.id) {
      throw new Error("Email is required");
    }

    // 6. Add property to data source
    try {
      const result = await DatabaseService.addPropertyToView({
        dataSourceId,
        propertyData: {
          name,
          type,
          options,
          linkedDatabaseId: linkedDatabaseId ? new ObjectId(linkedDatabaseId) : undefined,
          syncedPropertyId,
          syncedPropertyName,
          relationLimit,
          displayProperties,
          twoWayRelation,
          githubPrConfig,
        },
        userId: user.id,
        userEmail: user.email,
        userName: user.name || "Unknown User",
        viewId
      });

      const response: any = {
        success: true,
        property: result.property,
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
        message: `Property '${name}' added successfully`
      };

      // Include reverse datasource if two-way relation was created
      if (result.reverseDataSource && result.reverseProperty) {
        response.reverseProperty = result.reverseProperty;
        response.reverseDataSource = {
          _id: result.reverseDataSource._id,
          title: result.reverseDataSource.title,
          properties: result.reverseDataSource.properties,
          settings: result.reverseDataSource.settings,
          workspaceId: result.reverseDataSource.workspaceId,
          isSprint: result.reverseDataSource.isSprint,
          createdAt: result.reverseDataSource.createdAt,
          updatedAt: result.reverseDataSource.updatedAt,
          createdBy: result.reverseDataSource.createdBy,
        };
      }

      return NextResponse.json(response, { status: 201 });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Database source not found") {
          return NextResponse.json({ 
            message: "Data source not found" 
          }, { status: 404 });
        }
        if (error.message.includes("already exists")) {
          return NextResponse.json({ 
            message: error.message 
          }, { status: 400 });
        }
        if (error.message === "Failed to add property to view") {
          return NextResponse.json({ 
            message: "Failed to add property to view" 
          }, { status: 500 });
        }
      }
      throw error;
    }

  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create property",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
