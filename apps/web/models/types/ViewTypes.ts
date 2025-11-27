import { ObjectId } from "mongodb";
import { ViewType } from "./VeiwDatabase";

export type SortDirection = "ascending" | "descending";

export interface IFilter {
  propertyId: string;
  value: any;
  // Advanced filter fields (optional for backward compatibility)
  operator?: string; // "contains", "equals", "not_equals", "is_empty", "is_not_empty", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal"
  booleanOperator?: "AND" | "OR"; // Used to combine multiple rules
  isAdvanced?: boolean; // Flag to identify advanced filters
 // Allow disabling filters without deleting
}
export interface ISort {
  propertyId: string;
  direction: SortDirection;
}
export interface IGroup {
  propertyId: string;
  sortDirection?: SortDirection;
   hideEmptyGroups?: boolean;
   colotColumn?: boolean;
}
export interface IPropertyVisibility {
  propertyId: string;
}

// Advanced filter group structure
export interface IAdvancedFilterGroup {
  id: string;
  booleanOperator: "AND" | "OR"; // How this group combines with other groups
  rules: IAdvancedFilterRule[];
  groups?: IAdvancedFilterGroup[]; // Nested groups
}

export interface IAdvancedFilterRule {
  propertyId: string;
  operator: string; // "contains", "equals", "greater_than", etc.
  value: any;
  booleanOperator?: "AND" | "OR"; // Operator connecting this rule to the previous one (for flat rule lists)
}

export interface IViewTypeSettings {
  sorts?: ISort[];
  group?: IGroup; // Primary group (single property)
  propertyVisibility?: IPropertyVisibility[]; // Which properties are visible and their order
  filters?: IFilter[]; // Regular filters only
  advancedFilters?: IAdvancedFilterGroup[]; // Advanced filters (separate from regular filters)
}

/**
 * View Type Interface
 * Represents a single view (board, table, list, etc.) of a database
 */
export type IChartType = "verticalBar" |"horizontalBar" |"donut"| "line";

export interface IViewType {
  _id?: ObjectId;
  viewType: ViewType;
  icon: string;
  title: string;
  formTitle?: string;
  formDescription?: string;
  databaseSourceId: ObjectId; // Reference to the data source
  viewDatabaseId: ObjectId; // Links back to the IVeiwDatabase (parent collection)
  description?: string;
  formIcon?: string; // Form page icon
  formCoverImage?: string; // Form page cover 
  chartType?: IChartType;
  // View configuration and settings
  settings?: IViewTypeSettings;

  // View-specific metadata
  isLocked?: boolean; // Is this view locked from editing?

  isPublicForm?: boolean;
  formAnonymousResponses?: boolean;
  formAccessToSubmission?: "no_access" | "can_view_own";
}

export default IViewType;