"use client";

import { postWithAuth } from "@/lib/api-helpers";
import type { IFilter, ISort, IPropertyVisibility, IGroup, IAdvancedFilterGroup } from "@/models/types/ViewTypes";
import type { SortItem } from "@/types/board";
import { toast } from "sonner";

/**
 * Response type for settings API calls
 */
interface SettingsResponse {
  success: boolean;
  message?: string;
  viewType?: {
    _id?: string;
    settings?: {
      sorts?: ISort[];
      group?: IGroup;
      propertyVisibility?: IPropertyVisibility[];
      filters?: IFilter[];
      advancedFilters?: IAdvancedFilterGroup[];
    };
  };
  dataSource?: any;
  isError?: boolean;
}

/**
 * Convert frontend filters format to IFilter format
 * @param filters - Record<string, string[]> where key is propertyId and value is array of filter values
 * @returns IFilter[] array
 */
export function convertFiltersToIFilter(filters: Record<string, string[]>): IFilter[] {
  return Object.entries(filters).map(([propertyId, values]) => ({
    propertyId,
    value: Array.isArray(values) ? values : [values],
  }));
}

/**
 * Convert advanced filter groups to IAdvancedFilterGroup format
 * @param groups - AdvancedFilterGroup[] array
 * @returns IAdvancedFilterGroup[] array
 */
export function convertAdvancedFilterGroupsToIAdvancedFilterGroup(groups: Array<{
  id: string;
  booleanOperator: "AND" | "OR";
  rules: Array<{
    id: string;
    propertyId: string | null;
    operator: string;
    value: string | string[];
  }>;
  groups?: Array<{
    id: string;
    booleanOperator: "AND" | "OR";
    rules: Array<{
      id: string;
      propertyId: string | null;
      operator: string;
      value: string | string[];
    }>;
    groups?: any[];
  }>;
}>): IAdvancedFilterGroup[] {
  // If empty array, return empty array (will clear advanced filters)
  if (!groups || groups.length === 0) {
    return [];
  }
  
  return groups
    .map((group) => ({
      id: group.id,
      booleanOperator: group.booleanOperator,
      rules: group.rules
        .filter((rule) => rule.propertyId !== null && rule.propertyId !== "")
        .map((rule) => ({
          propertyId: rule.propertyId!,
          operator: rule.operator,
          value: rule.value,
          booleanOperator: (rule as any).booleanOperator, // Preserve booleanOperator if present
        })),
      groups: group.groups ? convertAdvancedFilterGroupsToIAdvancedFilterGroup(group.groups) : undefined,
    }))
    .filter((group) => group.rules.length > 0 || (group.groups && group.groups.length > 0));
}

/**
 * Convert frontend sorts format to ISort format
 * @param sorts - SortItem[] array
 * @returns ISort[] array
 */
export function convertSortsToISort(sorts: SortItem[]): ISort[] {
  return sorts.map((s) => ({
    propertyId: s.propertyId,
    direction: s.direction,
  }));
}

/**
 * Convert frontend property visibility format to IPropertyVisibility format
 * @param propertyIds - string[] array of property IDs
 * @returns IPropertyVisibility[] array
 */
export function convertPropertyVisibilityToIPropertyVisibility(
  propertyIds: string[]
): IPropertyVisibility[] {
  return propertyIds.map((propertyId) => ({
    propertyId,
  }));
}

/**
 * Update filters for a specific view type
 * @param viewTypeId - The ID of the view type
 * @param filters - Record<string, string[]> where key is propertyId and value is array of filter values
 * @returns Promise<SettingsResponse>
 */
export async function updateFilters(
  viewTypeId: string,
  filters: Record<string, string[]>
): Promise<SettingsResponse> {
  try {
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    // Convert to IFilter format
    const filtersArray = convertFiltersToIFilter(filters);

    const res = await postWithAuth<SettingsResponse>("/api/database/settings/filter", {
      viewTypeId,
      filters: filtersArray,
    });

    if ((res as { isError?: boolean })?.isError) {
      throw new Error((res as { message?: string }).message || "Failed to update filters");
    }

    if (!(res as { success?: boolean }).success) {
      throw new Error("Failed to update filters");
    }

    return res as SettingsResponse;
  } catch (error) {
    console.error("Error updating filters:", error);
    toast.error(error instanceof Error ? error.message : "Failed to update filters");
    throw error;
  }
}

/**
 * Update advanced filters for a specific view type
 * @param viewTypeId - The ID of the view type
 * @param groups - AdvancedFilterGroup[] array
 * @returns Promise<SettingsResponse>
 */
export async function updateAdvancedFilters(
  viewTypeId: string,
  groups: Array<{
    id: string;
    booleanOperator: "AND" | "OR";
    rules: Array<{
      id: string;
      propertyId: string | null;
      operator: string;
      value: string | string[];
    }>;
    groups?: Array<{
      id: string;
      booleanOperator: "AND" | "OR";
      rules: Array<{
        id: string;
        propertyId: string | null;
        operator: string;
        value: string | string[];
      }>;
      groups?: any[];
    }>;
  }>
): Promise<SettingsResponse> {
  try {
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    // Convert to IAdvancedFilterGroup format
    const advancedFiltersArray = convertAdvancedFilterGroupsToIAdvancedFilterGroup(groups);

    const res = await postWithAuth<SettingsResponse>("/api/database/settings/filter", {
      viewTypeId,
      advancedFilters: advancedFiltersArray,
    });

    if ((res as { isError?: boolean })?.isError) {
      throw new Error((res as { message?: string }).message || "Failed to update advanced filters");
    }

    if (!(res as { success?: boolean }).success) {
      throw new Error("Failed to update advanced filters");
    }

    return res as SettingsResponse;
  } catch (error) {
    console.error("Error updating advanced filters:", error);
    toast.error(error instanceof Error ? error.message : "Failed to update advanced filters");
    throw error;
  }
}

/**
 * Update sorts for a specific view type
 * @param viewTypeId - The ID of the view type
 * @param sorts - SortItem[] array
 * @returns Promise<SettingsResponse>
 */
export async function updateSorts(
  viewTypeId: string,
  sorts: SortItem[]
): Promise<SettingsResponse> {
  try {
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    // Convert to ISort format
    const sortsArray = convertSortsToISort(sorts);

    const res = await postWithAuth<SettingsResponse>("/api/database/settings/sort", {
      viewTypeId,
      sorts: sortsArray,
    });

    if ((res as { isError?: boolean })?.isError) {
      throw new Error((res as { message?: string }).message || "Failed to update sorts");
    }

    if (!(res as { success?: boolean }).success) {
      throw new Error("Failed to update sorts");
    }

    return res as SettingsResponse;
  } catch (error) {
    console.error("Error updating sorts:", error);
    toast.error(error instanceof Error ? error.message : "Failed to update sorts");
    throw error;
  }
}

/**
 * Update property visibility for a specific view type
 * @param viewTypeId - The ID of the view type
 * @param propertyIds - string[] array of property IDs that should be visible
 * @returns Promise<SettingsResponse>
 */
export async function updatePropertyVisibility(
  viewTypeId: string,
  propertyIds: string[]
): Promise<SettingsResponse> {
  try {
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    // Convert to IPropertyVisibility format
    const propertyVisibilityArray = convertPropertyVisibilityToIPropertyVisibility(propertyIds);

    const res = await postWithAuth<SettingsResponse>("/api/database/settings/propertyVisibility", {
      viewTypeId,
      propertyVisibility: propertyVisibilityArray,
    });

    if ((res as { isError?: boolean })?.isError) {
      throw new Error(
        (res as { message?: string }).message || "Failed to update property visibility"
      );
    }

    if (!(res as { success?: boolean }).success) {
      throw new Error("Failed to update property visibility");
    }

    return res as SettingsResponse;
  } catch (error) {
    console.error("Error updating property visibility:", error);
    toast.error(error instanceof Error ? error.message : "Failed to update property visibility");
    throw error;
  }
}

/**
 * Convert propertyId to IGroup format
 * @param propertyId - The property ID to group by
 * @param sortDirection - Optional sort direction for the group
 * @param hideEmptyGroups - Optional flag to hide empty groups
 * @param colorColumn - Optional flag to color the column
 * @returns IGroup object
 */
export function convertPropertyIdToIGroup(
  propertyId: string,
  sortDirection?: "ascending" | "descending",
  hideEmptyGroups?: boolean,
  colorColumn?: boolean
): IGroup {
  return {
    propertyId,
    sortDirection,
    hideEmptyGroups,
    colotColumn: colorColumn, // Note: backend uses 'colotColumn' (typo in schema)
  };
}

/**
 * Update group settings for a specific view type
 * @param viewTypeId - The ID of the view type
 * @param group - IGroup object or null to remove grouping
 * @returns Promise<SettingsResponse>
 */
export async function updateGroup(
  viewTypeId: string,
  group: IGroup | null
): Promise<SettingsResponse> {
  try {
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    const res = await postWithAuth<SettingsResponse>("/api/database/settings/group", {
      viewTypeId,
      group: group || null,
    });

    if ((res as { isError?: boolean })?.isError) {
      throw new Error((res as { message?: string }).message || "Failed to update group");
    }

    if (!(res as { success?: boolean }).success) {
      throw new Error("Failed to update group");
    }

    return res as SettingsResponse;
  } catch (error) {
    console.error("Error updating group:", error);
    toast.error(error instanceof Error ? error.message : "Failed to update group");
    throw error;
  }
}

/**
 * Update group settings for a specific view type using propertyId
 * This is a convenience function that converts propertyId to IGroup format
 * @param viewTypeId - The ID of the view type
 * @param propertyId - The property ID to group by, or undefined/null to remove grouping
 * @param sortDirection - Optional sort direction for the group
 * @param hideEmptyGroups - Optional flag to hide empty groups
 * @param colorColumn - Optional flag to color the column
 * @returns Promise<SettingsResponse>
 */
export async function updateGroupByPropertyId(
  viewTypeId: string,
  propertyId: string | undefined | null,
  sortDirection?: "ascending" | "descending",
  hideEmptyGroups?: boolean,
  colorColumn?: boolean
): Promise<SettingsResponse> {
  const group = propertyId
    ? convertPropertyIdToIGroup(propertyId, sortDirection, hideEmptyGroups, colorColumn)
    : null;
  return updateGroup(viewTypeId, group);
}

/**
 * Toggle lock status for a specific view type
 * @param viewTypeId - The ID of the view type
 * @param isLocked - boolean indicating if the view should be locked
 * @returns Promise<SettingsResponse & { isLocked?: boolean }>
 */
export async function toggleLock(
  viewTypeId: string,
  isLocked: boolean
): Promise<SettingsResponse & { isLocked?: boolean }> {
  try {
    if (!viewTypeId) {
      throw new Error("View type ID is required");
    }

    const res = await postWithAuth<SettingsResponse & { isLocked?: boolean }>(
      "/api/database/settings/lock",
      {
        viewTypeId,
        isLocked,
      }
    );

    if ((res as { isError?: boolean })?.isError) {
      throw new Error((res as { message?: string }).message || "Failed to toggle lock");
    }

    if (!(res as { success?: boolean }).success) {
      throw new Error("Failed to toggle lock");
    }

    return res as SettingsResponse & { isLocked?: boolean };
  } catch (error) {
    console.error("Error toggling lock:", error);
    toast.error(error instanceof Error ? error.message : "Failed to toggle lock");
    throw error;
  }
}

/**
 * Export all converter functions for convenience
 */
export const DatabaseSettingsConverters = {
  convertFiltersToIFilter,
  convertSortsToISort,
  convertPropertyVisibilityToIPropertyVisibility,
  convertPropertyIdToIGroup,
};

/**
 * Export all update functions for convenience
 */
export const DatabaseSettingsAPI = {
  updateFilters,
  updateSorts,
  updatePropertyVisibility,
  updateGroup,
  updateGroupByPropertyId,
  toggleLock,
};


