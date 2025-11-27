import { type NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/services/databaseService";
import { ObjectId } from "mongodb";
export async function POST(req: NextRequest) {
  try {    // Parse request body
    const body = await req.json();
    const {
      dataSourceId,
      viewId, // Optional for audit purposes
      propertyId,
      newName,
      options,
      type,
      showProperty = false,
      // Number property settings
      numberFormat,
      decimalPlaces,
      showAs,
      progressColor,
      progressDivideBy,
      showNumberText,
      // Formula property settings
      formula,
      formulaReturnType,
      // Relation property settings
      relationLimit,
      rollup,
      githubPrConfig,
      // Form metadata
      formMetaData,
    } = body;

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

    if (!newName) {
      return NextResponse.json({ 
        message: "newName is required" 
      }, { status: 400 });
    }

    // 5. Update property schema
    try {
      const normalizedRollup = rollup
        ? {
            relationPropertyId: rollup.relationPropertyId,
            relationDataSourceId: rollup.relationDataSourceId ? new ObjectId(rollup.relationDataSourceId) : undefined,
            targetPropertyId: rollup.targetPropertyId,
            calculation: rollup.calculation,
            selectedOptions: rollup.selectedOptions,
          }
        : undefined;

      const result = await DatabaseService.updatePropertySchema({
        dataSourceId,
        propertyId,
        newName,
        type,
        options,
        showProperty,
        viewId,
        // Number property settings
        numberFormat,
        decimalPlaces,
        showAs,
        progressColor,
        progressDivideBy,
        showNumberText,
        // Formula property settings
        formula,
        formulaReturnType,
        // Relation property settings
        relationLimit,
        rollup: normalizedRollup,
        githubPrConfig,
        // Form metadata
        formMetaData,
      });
        return NextResponse.json({
        success: true,
        dataSource: {
          _id: result?.dataSource._id,
          title: result?.dataSource.title,
          properties: result?.dataSource.properties,
          settings: result?.dataSource.settings,
          workspaceId: result?.dataSource.workspaceId,
          isSprint: result?.dataSource.isSprint,
          createdAt: result?.dataSource.createdAt,
          updatedAt: result?.dataSource.updatedAt,
          createdBy: result?.dataSource.createdBy,
        },
        propertyId: result?.propertyId,
        newName: result?.newName,
        updatedAt: result?.updatedAt,
        message: `Property is updated'`
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
        if (error.message === "Failed to update property name" || error.message === "Failed to update property schema") {
          return NextResponse.json({ 
            message: "Failed to update property schema" 
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
