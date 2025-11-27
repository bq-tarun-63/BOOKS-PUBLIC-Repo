import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import { IViewType, IPropertyVisibility, ISort, IFilter, IGroup, IAdvancedFilterGroup } from "@/models/types/ViewTypes";

export const DatabaseSettingService = {
  /**
   * Update property visibility for a specific view type
   * @param viewTypeId - The ID of the view type to update
   * @param propertyVisibility - Array of property visibility configurations
   * @returns Updated view type
   */
  async updatePropertyVisibility({
    viewTypeId,
    propertyVisibility,
  }: {
    viewTypeId: string;
    propertyVisibility: IPropertyVisibility[];
  }) {
    const client = await clientPromise();
    const db = client.db();
    const viewTypesCollection = db.collection<IViewType>("viewTypes");

    // Validate viewTypeId
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    // Validate propertyVisibility
    if (!Array.isArray(propertyVisibility)) {
      throw new Error("Property visibility must be an array");
    }

    const viewTypeObjectId = new ObjectId(viewTypeId);

    // Get existing view type to preserve other settings
    const existingViewType = await viewTypesCollection.findOne({
      _id: viewTypeObjectId,
    });

    if (!existingViewType) {
      throw new Error("View type not found");
    }

    // Merge with existing settings to preserve other settings (sorts, filters, group, etc.)
    const existingSettings = existingViewType.settings || {};
    const updatedSettings = {
      ...existingSettings,
      propertyVisibility: propertyVisibility,
    };

    // Update the view type with new property visibility and return updated document
    const updatedViewType = await viewTypesCollection.findOneAndUpdate(
      { _id: viewTypeObjectId },
      {
        $set: {
          settings: updatedSettings,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!updatedViewType) {
      throw new Error("View type not found or failed to update property visibility");
    }

    return {
      success: true,
      viewType: updatedViewType,
    };
  },

  /**
   * Update sorts for a specific view type
   * @param viewTypeId - The ID of the view type to update
   * @param sorts - Array of sort configurations
   * @returns Updated view type
   */
  async updateSorts({
    viewTypeId,
    sorts,
  }: {
    viewTypeId: string;
    sorts: ISort[];
  }) {
    const client = await clientPromise();
    const db = client.db();
    const viewTypesCollection = db.collection<IViewType>("viewTypes");

    // Validate viewTypeId
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    // Validate sorts
    if (!Array.isArray(sorts)) {
      throw new Error("Sorts must be an array");
    }

    const viewTypeObjectId = new ObjectId(viewTypeId);

    // Get existing view type to preserve other settings
    const existingViewType = await viewTypesCollection.findOne({
      _id: viewTypeObjectId,
    });

    if (!existingViewType) {
      throw new Error("View type not found");
    }

    // Merge with existing settings to preserve other settings (propertyVisibility, filters, group, etc.)
    const existingSettings = existingViewType.settings || {};
    const updatedSettings = {
      ...existingSettings,
      sorts: sorts,
    };

    // Update the view type with new sorts and return updated document
    const updatedViewType = await viewTypesCollection.findOneAndUpdate(
      { _id: viewTypeObjectId },
      {
        $set: {
          settings: updatedSettings,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!updatedViewType) {
      throw new Error("View type not found or failed to update sorts");
    }

    return {
      success: true,
      viewType: updatedViewType,
    };
  },

  /**
   * Toggle lock status for a specific view type
   * @param viewTypeId - The ID of the view type to toggle lock
   * @param isLocked - Optional: explicitly set lock state. If not provided, toggles current state
   * @returns Updated view type
   */
  async toggleLock({
    viewTypeId,
    isLocked,
  }: {
    viewTypeId: string;
    isLocked?: boolean;
  }) {
    const client = await clientPromise();
    const db = client.db();
    const viewTypesCollection = db.collection<IViewType>("viewTypes");

    // Validate viewTypeId
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    const viewTypeObjectId = new ObjectId(viewTypeId);

    // Get existing view type
    const existingViewType = await viewTypesCollection.findOne({
      _id: viewTypeObjectId,
    });

    if (!existingViewType) {
      throw new Error("View type not found");
    }

    // Determine new lock state: if isLocked is provided, use it; otherwise toggle
    const newLockState =
      isLocked !== undefined ? isLocked : !existingViewType.isLocked;

    // Update the view type with new lock state and return updated document
    const updatedViewType = await viewTypesCollection.findOneAndUpdate(
      { _id: viewTypeObjectId },
      {
        $set: {
          isLocked: newLockState,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!updatedViewType) {
      throw new Error("View type not found or failed to toggle lock");
    }

    return {
      success: true,
      viewType: updatedViewType,
      isLocked: updatedViewType.isLocked,
    };
  },

  /**
   * Update filters for a specific view type
   * @param viewTypeId - The ID of the view type to update
   * @param filters - Array of filter configurations
   * @returns Updated view type
   */
  async updateFilters({
    viewTypeId,
    filters,
  }: {
    viewTypeId: string;
    filters: IFilter[];
  }) {
    const client = await clientPromise();
    const db = client.db();
    const viewTypesCollection = db.collection<IViewType>("viewTypes");

    // Validate viewTypeId
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    // Validate filters
    if (!Array.isArray(filters)) {
      throw new Error("Filters must be an array");
    }

    const viewTypeObjectId = new ObjectId(viewTypeId);

    // Get existing view type to preserve other settings
    const existingViewType = await viewTypesCollection.findOne({
      _id: viewTypeObjectId,
    });

    if (!existingViewType) {
      throw new Error("View type not found");
    }

    // Merge with existing settings to preserve other settings (propertyVisibility, sorts, group, etc.)
    const existingSettings = existingViewType.settings || {};
    
    // Regular filters only - advanced filters are stored separately in advancedFilters field
    // Ensure no advanced filters (with isAdvanced flag) are in the regular filters array
    const mergedFilters = filters.filter((f: IFilter) => !f.isAdvanced);
    
    const updatedSettings = {
      ...existingSettings,
      filters: mergedFilters,
    };

    // Update the view type with new filters and return updated document
    const updatedViewType = await viewTypesCollection.findOneAndUpdate(
      { _id: viewTypeObjectId },
      {
        $set: {
          settings: updatedSettings,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!updatedViewType) {
      throw new Error("View type not found or failed to update filters");
    }

    return {
      success: true,
      viewType: updatedViewType,
    };
  },

  /**
   * Update advanced filters for a specific view type
   * @param viewTypeId - The ID of the view type to update
   * @param advancedFilters - Array of advanced filter groups
   * @returns Updated view type
   */
  async updateAdvancedFilters({
    viewTypeId,
    advancedFilters,
  }: {
    viewTypeId: string;
    advancedFilters: IAdvancedFilterGroup[];
  }) {
    const client = await clientPromise();
    const db = client.db();
    const viewTypesCollection = db.collection<IViewType>("viewTypes");

    // Validate viewTypeId
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    // Validate advancedFilters
    if (!Array.isArray(advancedFilters)) {
      throw new Error("Advanced filters must be an array");
    }

    const viewTypeObjectId = new ObjectId(viewTypeId);

    // Get existing view type to preserve other settings
    const existingViewType = await viewTypesCollection.findOne({
      _id: viewTypeObjectId,
    });

    if (!existingViewType) {
      throw new Error("View type not found");
    }

    // Merge with existing settings to preserve other settings
    const existingSettings = existingViewType.settings || {};
    const updatedSettings = {
      ...existingSettings,
      advancedFilters: advancedFilters, // Store separately from regular filters
    };

    // Update the view type with new advanced filters and return updated document
    const updatedViewType = await viewTypesCollection.findOneAndUpdate(
      { _id: viewTypeObjectId },
      {
        $set: {
          settings: updatedSettings,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!updatedViewType) {
      throw new Error("View type not found or failed to update advanced filters");
    }

    return {
      success: true,
      viewType: updatedViewType,
    };
  },

  /**
   * Update group settings for a specific view type
   * @param viewTypeId - The ID of the view type to update
   * @param group - Group configuration or null to remove grouping
   * @returns Updated view type
   */
  async updateGroup(
    viewTypeId: string,
    group: IGroup | null
  ) {
    const client = await clientPromise();
    const db = client.db();
    const viewTypesCollection = db.collection<IViewType>("viewTypes");

    // Validate viewTypeId
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    const viewTypeObjectId = new ObjectId(viewTypeId);

    // Get existing view type to preserve other settings
    const existingViewType = await viewTypesCollection.findOne({
      _id: viewTypeObjectId,
    });

    if (!existingViewType) {
      throw new Error("View type not found");
    }

    // Merge with existing settings to preserve other settings (propertyVisibility, sorts, filters, etc.)
    const existingSettings = existingViewType.settings || {};
    const updatedSettings = {
      ...existingSettings,
      group: group || undefined, // Set to undefined if null to remove grouping
    };

    // Update the view type with new group settings
    const updateResult = await viewTypesCollection.updateOne(
      { _id: viewTypeObjectId },
      {
        $set: {
          settings: updatedSettings,
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      throw new Error("View type not found");
    }

    if (updateResult.modifiedCount === 0) {
      throw new Error("Failed to update group");
    }

    // Return the updated view type
    const updatedViewType = await viewTypesCollection.findOne({
      _id: viewTypeObjectId,
    });

    if (!updatedViewType) {
      throw new Error("Failed to retrieve updated view type");
    }

    return {
      success: true,
      viewType: updatedViewType,
    };
  },

  /**
   * Get viewType settings by ID
   * @param viewTypeId - The ID of the view type to retrieve
   * @returns View type with settings
   */
  async getViewTypeById(viewTypeId: string) {
    const client = await clientPromise();
    const db = client.db();
    const viewTypesCollection = db.collection<IViewType>("viewTypes");

    // Validate viewTypeId
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    const viewTypeObjectId = new ObjectId(viewTypeId);

    // Get viewType from database
    const viewType = await viewTypesCollection.findOne({
      _id: viewTypeObjectId,
    });

    if (!viewType) {
      throw new Error("View type not found");
    }

    return {
      success: true,
      viewType: {
        _id: viewType._id,
        settings: viewType.settings || {},
        isLocked: viewType.isLocked || false,
      },
    };
  },
};

