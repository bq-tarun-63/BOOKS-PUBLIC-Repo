# Database Source Architecture - Optimal Approach

## Current State Analysis

### Current Structure Issues:
1. **`IVeiwDatabase.noteId`** - Ambiguous: Is this the page where database is embedded, or the database source page?
2. **`INote.databaseViewId`** - Links notes to a view (correct)
3. **`INote.databaseNoteId`** - Unclear purpose
4. **Mixed concepts** - View/Block and Source are not clearly separated

---

## Notion's Database Model

### Three Key Concepts:

1. **Database Source** (The actual database)
   - Contains all properties schema
   - Contains all notes/rows
   - Can be created as a full page OR inline
   - Has a unique ID

2. **Database Page** (Full-page database)
   - A page that IS the database
   - Can be linked to from other pages
   - Has a noteId that equals the database source

3. **Database Block** (Inline/embedded database)
   - A view of a database embedded on another page
   - References a database source
   - Can have its own view configuration (filters, sorts, groupings)
   - Multiple blocks can reference the same source

---

## Recommended Architecture

### Option 1: Minimal Changes (Recommended for now)

**Keep `IVeiwDatabase` as Database Source**, but clarify fields:

```typescript
export interface IVeiwDatabase {
  _id?: ObjectId;                    // Database Source ID
  noteId?: string;                    // Optional: Page that IS this database (full-page database)
  sourceDatabaseId?: ObjectId;        // Optional: If this is a view, reference to source
  title: string;                      // Database title
  description?: string;
  createdBy: { ... };
  createdAt: Date;
  updatedAt?: Date;
  properties: Record<string, PropertySchema>;  // Schema definition
  viewsType: ViewTypeWithIconAndTitle[];      // Available view types
  workspaceId?: string;
  organizationDomain?: string;
  isSprint?: boolean;
  
  // NEW: For inline database blocks
  isInline?: boolean;                 // true if embedded, false if full-page
  parentPageId?: ObjectId;            // If inline, which page contains it
  viewConfig?: {                      // View-specific config (filters, sorts, etc.)
    filters?: any[];
    sorts?: any[];
    groups?: any[];
  };
}
```

**Benefits:**
- Minimal breaking changes
- Clear separation of source vs view
- Supports both full-page and inline databases

---

### Option 2: Separate Collections (More scalable, future-proof)

**Create two separate collections:**

#### 1. Database Source Collection
```typescript
export interface IDatabaseSource {
  _id?: ObjectId;
  title: string;
  description?: string;
  properties: Record<string, PropertySchema>;
  createdBy: { ... };
  workspaceId?: string;
  organizationDomain?: string;
  createdAt: Date;
  updatedAt?: Date;
  // Metadata
  isFullPageDatabase?: boolean;      // If true, there's a page that IS this database
  databasePageId?: ObjectId;         // The page ID if it's a full-page database
}
```

#### 2. Database View/Block Collection
```typescript
export interface IDatabaseView {
  _id?: ObjectId;
  sourceDatabaseId: ObjectId;        // Reference to IDatabaseSource
  parentPageId?: ObjectId;            // Page where this view is embedded (if inline)
  viewType: ViewType;                 // board, table, list, etc.
  title: string;                      // View name
  icon: string;
  
  // View configuration
  filters?: any[];
  sorts?: any[];
  groups?: any[];
  hiddenProperties?: string[];        // Properties to hide in this view
  
  createdBy: { ... };
  createdAt: Date;
  updatedAt?: Date;
}
```

**Benefits:**
- Complete separation of concerns
- One source can have multiple views
- Better scalability
- More complex to migrate

---

## Recommended Implementation Plan

### Phase 1: Enhance Current Structure (Quick Win)

1. **Clarify `noteId` field purpose:**
   - If `noteId` exists → This is a full-page database
   - If `noteId` is empty → This is an inline database (or standalone source)

2. **Add `sourceDatabaseId` field:**
   - For inline database blocks that reference another source
   - Allows: "Create database block" → link to existing source

3. **Add view configuration:**
   - Store filters, sorts, groupings per view
   - Each view can have different configs

### Phase 2: Support Database Source Selection

1. **Create API to get all database sources:**
   ```typescript
   GET /api/database/sources
   // Returns all available database sources user can link to
   ```

2. **Create API to create database block (inline):**
   ```typescript
   POST /api/database/createBlock
   {
     sourceDatabaseId: "xxx",  // Link to existing source
     parentPageId: "yyy",        // Page where it's embedded
     viewType: "board",
     viewConfig: { ... }
   }
   ```

3. **Update createView to support:**
   - Creating new source (full-page or inline)
   - Creating block that links to existing source

---

## Schema Updates

### Update `PropertySchema` for Relation Support:

```typescript
export interface PropertySchema { 
  name: string;
  type: PropertyType;
  options?: PropertyOption[];
  default?: boolean;
  showProperty?: boolean;
  formula?: string;
  formulaReturnType?: "text" | "number" | "boolean" | "date";
  
  // NEW: Relation-specific fields
  linkedDatabaseId?: ObjectId;        // For relation: which database to link to
  syncedPropertyId?: string;           // For two-way relations
  syncedPropertyName?: string;         // For two-way relations
  relationLimit?: "single" | "multiple";
  displayProperties?: string[];        // Which properties to show from related records
}
```

---

## Migration Strategy

1. **Backward Compatibility:**
   - Keep existing `noteId` field
   - Add new optional fields
   - Existing databases continue to work

2. **Gradual Migration:**
   - New databases use new structure
   - Old databases can be migrated later
   - Add migration script if needed

3. **Frontend Support:**
   - UI to select "Create new database" vs "Link to existing database"
   - Show database source selector when creating relation property

---

## Example Use Cases

### Use Case 1: Create Full-Page Database
```
1. User creates new page
2. Converts page to database
3. noteId = page._id
4. isInline = false
```

### Use Case 2: Create Inline Database Block
```
1. User is on page "Project Plan"
2. Inserts database block
3. Creates new database source
4. parentPageId = "Project Plan"
5. isInline = true
```

### Use Case 3: Link to Existing Database
```
1. User is on page "Dashboard"
2. Inserts database block
3. Selects existing database source
4. sourceDatabaseId = existing database._id
5. parentPageId = "Dashboard"
6. isInline = true
```

### Use Case 4: Relation Property
```
1. User creates relation property in Database A
2. Selects Database B as source
3. linkedDatabaseId = Database B._id
4. Users can now link notes from Database B
```

---

## Next Steps

1. ✅ Add `linkedDatabaseId` to `PropertySchema` (for relations)
2. ✅ Add optional `sourceDatabaseId` to `IVeiwDatabase`
3. ✅ Add `viewConfig` to `IVeiwDatabase` for view-specific settings
4. ✅ Create API to list all database sources
5. ✅ Update createView to support linking to existing source
6. ⏳ Add UI for database source selection
7. ⏳ Implement view configuration UI

