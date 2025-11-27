# Database Schema Options - Complete TypeScript Definitions

## Option 1: Enhanced Current Structure (Minimal Changes)

### Complete Schema:

```typescript
import { ObjectId } from "mongodb";

/**
 * Allowed property types
 */
export type PropertyType =
  | "title"
  | "text"
  | "status"
  | "relation"
  | "comments"
  | "person"
  | "date"
  | "checkbox"
  | "number"
  | "formula"
  | "priority"
  | "select"
  | "multi_select";

/**
 * Select/Multi-select option
 */
export interface PropertyOption {
  id: string;       // internal option id (UUID/string)
  name: string;     // display name ("In Progress", "Done", etc.)
  color?: string;   // optional color
}

/**
 * View configuration (filters, sorts, groupings)
 */
export interface ViewConfig {
  filters?: Array<{
    propertyId: string;
    operator: "equals" | "not_equals" | "contains" | "does_not_contain" | 
             "greater_than" | "less_than" | "is_empty" | "is_not_empty";
    value: any;
  }>;
  sorts?: Array<{
    propertyId: string;
    direction: "ascending" | "descending";
  }>;
  groups?: Array<{
    propertyId: string;
    collapsed?: boolean;
  }>;
  hiddenProperties?: string[];  // Property IDs to hide in this view
}

/**
 * Property schema (defines one column in the database)
 */
export interface PropertySchema { 
  name: string;              // "Status", "Assign", etc.
  type: PropertyType;
  options?: PropertyOption[];
  default?: boolean;
  showProperty?: boolean;
  formula?: string;
  formulaReturnType?: "text" | "number" | "boolean" | "date";
  
  // NEW: Relation-specific fields
  linkedDatabaseId?: ObjectId;        // For relation: which database to link to
  syncedPropertyId?: string;           // For two-way relations (property ID in linked database)
  syncedPropertyName?: string;         // For two-way relations (property name in linked database)
  relationLimit?: "single" | "multiple";  // Limit to 1 relation or allow multiple
  displayProperties?: string[];        // Which properties to show from related records
}

/**
 * Database note properties (stored in note properties)
 */
export interface DatabaseNoteProperties {
  [propertyId: string]: any;  // key = propertyId, value depends on property type
}

/**
 * View definition (board/table/list/etc.)
 */
export type ViewType = "board" | "table" | "list" | "calendar" | "timeline" | "list_sprint";

export interface ViewTypeWithIconAndTitle {
  viewType: ViewType;
  icon: string;
  title: string;
}

/**
 * Database View/Source (Option 1: Enhanced Current Structure)
 * 
 * This represents either:
 * - A full-page database (when noteId exists and isInline = false)
 * - An inline database block (when parentPageId exists and isInline = true)
 * - A standalone database source (when sourceDatabaseId exists)
 */
export interface IVeiwDatabase {
  _id?: ObjectId;                    // Database Source ID (unique identifier)
  noteId?: string;                    // Optional: Page that IS this database (full-page database)
                                      // If exists: This is a full-page database
                                      // If empty: This is an inline database or standalone source
  
  // NEW FIELDS:
  sourceDatabaseId?: ObjectId;        // Optional: If this is a view/block, reference to source database
                                       // Allows linking to existing database source
  isInline?: boolean;                  // true if embedded on a page, false if full-page database
  parentPageId?: ObjectId;             // If inline, which page contains this database block
  viewConfig?: ViewConfig;             // View-specific configuration (filters, sorts, groups)
  
  // EXISTING FIELDS:
  title: string;                       // Database title
  description?: string;
  createdBy: {
    userId: ObjectId;
    userName: string;
    userEmail: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  properties: Record<string, PropertySchema>;  // Schema definition (all properties)
  viewsType: ViewTypeWithIconAndTitle[];        // Available view types
  workspaceId?: string;
  organizationDomain?: string;
  isSprint?: boolean;
}
```

### Usage Examples (Option 1):

```typescript
// Example 1: Full-page database
const fullPageDatabase: IVeiwDatabase = {
  _id: new ObjectId("db123"),
  noteId: "page123",              // This page IS the database
  isInline: false,
  title: "Project Tasks",
  properties: { ... },
  viewsType: [{ viewType: "board", icon: "grid", title: "Board" }],
  // ... other fields
};

// Example 2: Inline database block (new source)
const inlineDatabase: IVeiwDatabase = {
  _id: new ObjectId("db456"),
  isInline: true,
  parentPageId: new ObjectId("page789"),  // Embedded on this page
  title: "Team Members",
  properties: { ... },
  viewConfig: {
    filters: [{ propertyId: "status", operator: "equals", value: "active" }],
    sorts: [{ propertyId: "name", direction: "ascending" }]
  },
  // ... other fields
};

// Example 3: Inline database block (linking to existing source)
const linkedDatabaseBlock: IVeiwDatabase = {
  _id: new ObjectId("view789"),
  sourceDatabaseId: new ObjectId("db123"),  // Links to existing database
  isInline: true,
  parentPageId: new ObjectId("page999"),
  title: "Project Tasks View",             // Different title for this view
  viewConfig: {
    filters: [{ propertyId: "priority", operator: "equals", value: "high" }]
  },
  // Note: properties are inherited from sourceDatabaseId
};
```

---

## Option 2: Separate Collections (Two-Collection Approach)

### Complete Schema:

```typescript
import { ObjectId } from "mongodb";

/**
 * Allowed property types
 */
export type PropertyType =
  | "title"
  | "text"
  | "status"
  | "relation"
  | "comments"
  | "person"
  | "date"
  | "checkbox"
  | "number"
  | "formula"
  | "priority"
  | "select"
  | "multi_select";

/**
 * Select/Multi-select option
 */
export interface PropertyOption {
  id: string;
  name: string;
  color?: string;
}

/**
 * Property schema (defines one column in the database)
 */
export interface PropertySchema { 
  name: string;
  type: PropertyType;
  options?: PropertyOption[];
  default?: boolean;
  showProperty?: boolean;
  formula?: string;
  formulaReturnType?: "text" | "number" | "boolean" | "date";
  
  // Relation-specific fields
  linkedDatabaseId?: ObjectId;
  syncedPropertyId?: string;
  syncedPropertyName?: string;
  relationLimit?: "single" | "multiple";
  displayProperties?: string[];
}

/**
 * View configuration (filters, sorts, groupings)
 */
export interface ViewConfig {
  filters?: Array<{
    propertyId: string;
    operator: "equals" | "not_equals" | "contains" | "does_not_contain" | 
             "greater_than" | "less_than" | "is_empty" | "is_not_empty";
    value: any;
  }>;
  sorts?: Array<{
    propertyId: string;
    direction: "ascending" | "descending";
  }>;
  groups?: Array<{
    propertyId: string;
    collapsed?: boolean;
  }>;
  hiddenProperties?: string[];
}

/**
 * View definition (board/table/list/etc.)
 */
export type ViewType = "board" | "table" | "list" | "calendar" | "timeline" | "list_sprint";

export interface ViewTypeWithIconAndTitle {
  viewType: ViewType;
  icon: string;
  title: string;
}

/**
 * OPTION 2 - COLLECTION 1: Database Source
 * 
 * This is the actual database - contains schema and all data.
 * Notes belong to a database source via databaseViewId.
 */
export interface IDatabaseSource {
  _id?: ObjectId;                    // Database Source ID (unique identifier)
  title: string;                      // Database title
  description?: string;
  
  // Properties schema (defines all columns)
  properties: Record<string, PropertySchema>;
  
  // Metadata
  createdBy: {
    userId: ObjectId;
    userName: string;
    userEmail: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  
  // Organization context
  workspaceId?: string;
  organizationDomain?: string;
  
  // Optional: If this is a full-page database
  isFullPageDatabase?: boolean;        // true if there's a page that IS this database
  databasePageId?: ObjectId;           // The page ID if it's a full-page database
  
  // Additional metadata
  isSprint?: boolean;
}

/**
 * OPTION 2 - COLLECTION 2: Database View/Block
 * 
 * This represents a view of a database source.
 * Can be embedded on a page or be a full-page view.
 * Multiple views can reference the same source.
 */
export interface IDatabaseView {
  _id?: ObjectId;                     // View/Block ID (unique identifier)
  sourceDatabaseId: ObjectId;         // REQUIRED: Reference to IDatabaseSource
  title: string;                      // View name (can differ from source title)
  viewType: ViewType;                 // board, table, list, etc.
  icon: string;                       // Icon for this view
  
  // Optional: If this view is embedded on a page
  isInline?: boolean;                 // true if embedded, false if standalone
  parentPageId?: ObjectId;             // Page where this view is embedded (if inline)
  
  // View configuration (filters, sorts, groups, hidden properties)
  viewConfig?: ViewConfig;
  
  // Metadata
  createdBy: {
    userId: ObjectId;
    userName: string;
    userEmail: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  
  // Additional metadata
  isDefault?: boolean;                 // Is this the default view for the source?
  order?: number;                      // Display order
}

/**
 * Note interface (updated for Option 2)
 */
export interface INote {
  // ... existing fields ...
  
  // Database specific
  databaseSourceId?: ObjectId;         // Which database source this note belongs to
  databaseViewId?: ObjectId;          // Which view this note is displayed in (optional)
  
  databaseProperties?: Record<string, any>;
  formulaErrors?: Record<string, string>;
  // ... other fields ...
}
```

### Usage Examples (Option 2):

```typescript
// Example 1: Create database source (full-page)
const databaseSource: IDatabaseSource = {
  _id: new ObjectId("source123"),
  title: "Project Tasks",
  properties: {
    "prop_status": {
      name: "Status",
      type: "status",
      options: [...]
    },
    // ... more properties
  },
  isFullPageDatabase: true,
  databasePageId: new ObjectId("page123"),  // This page IS the database
  createdBy: { ... },
  createdAt: new Date(),
  // ... other fields
};

// Example 2: Create view for the source (full-page view)
const fullPageView: IDatabaseView = {
  _id: new ObjectId("view123"),
  sourceDatabaseId: new ObjectId("source123"),  // Links to source
  title: "Board View",
  viewType: "board",
  icon: "grid",
  isInline: false,
  viewConfig: {
    groups: [{ propertyId: "prop_status" }]
  },
  isDefault: true,
  createdBy: { ... },
  createdAt: new Date(),
};

// Example 3: Create inline database block (links to existing source)
const inlineView: IDatabaseView = {
  _id: new ObjectId("view456"),
  sourceDatabaseId: new ObjectId("source123"),  // Links to same source
  title: "High Priority Tasks",
  viewType: "table",
  icon: "table",
  isInline: true,
  parentPageId: new ObjectId("page789"),       // Embedded on this page
  viewConfig: {
    filters: [{ propertyId: "prop_priority", operator: "equals", value: "high" }],
    sorts: [{ propertyId: "prop_created", direction: "descending" }]
  },
  createdBy: { ... },
  createdAt: new Date(),
};

// Example 4: Another view of same source (different configuration)
const anotherView: IDatabaseView = {
  _id: new ObjectId("view789"),
  sourceDatabaseId: new ObjectId("source123"),  // Same source
  title: "Calendar View",
  viewType: "calendar",
  icon: "calendar",
  isInline: false,
  viewConfig: {
    hiddenProperties: ["prop_assignee"],
    sorts: [{ propertyId: "prop_date", direction: "ascending" }]
  },
  createdBy: { ... },
  createdAt: new Date(),
};
```

---

## Comparison Summary

### Option 1: Enhanced Current Structure

**Pros:**
- ✅ Minimal changes to existing code
- ✅ Backward compatible
- ✅ Simpler migration
- ✅ Single collection to manage
- ✅ Faster to implement

**Cons:**
- ⚠️ Less separation of concerns
- ⚠️ Can have duplicate data if linking to source
- ⚠️ Harder to manage multiple views of same source

**Best For:**
- Quick implementation
- Existing codebase with minimal refactoring
- Simpler use cases

---

### Option 2: Separate Collections

**Pros:**
- ✅ Complete separation of concerns
- ✅ One source → multiple views (no data duplication)
- ✅ Better scalability
- ✅ Clearer data model
- ✅ Easier to manage view configurations independently

**Cons:**
- ⚠️ Requires significant refactoring
- ⚠️ More complex queries (need to join collections)
- ⚠️ More complex migration
- ⚠️ Two collections to manage

**Best For:**
- Long-term scalability
- Complex use cases with multiple views
- Fresh start or major refactoring

---

## Recommendation

**Start with Option 1** for immediate implementation, then consider migrating to Option 2 if you need:
- Multiple views of the same database source
- Complex view management
- Better scalability at scale

