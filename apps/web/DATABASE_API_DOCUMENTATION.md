# Database API Documentation

This document provides comprehensive documentation for all Database APIs created today. These APIs allow frontend developers to manage database views, properties, and property values.

## Base URL
All API endpoints are prefixed with: `/api/database/`

## Authentication
All endpoints require authentication via NextAuth session. Include the session cookie in your requests.

---

## 1. Create View
**Endpoint:** `POST /api/database/createView`

Creates a new database view with optional properties.

### Request Body
```json
{
  "workspaceId": "string",
  "title": "string",
  "description": "string (optional)",
  "createdBy": {
    "userId": "string",
    "userName": "string", 
    "userEmail": "string"
  },
  "viewsType": ["board" | "table" | "list" | "calendar"] (optional)
}
```

### Response (Success - 201)
```json
{
  "success": true,
  "view": {
    "_id": "ObjectId",
    "title": "string",
    "description": "string",
    "createdBy": {
      "userId": "ObjectId",
      "userName": "string",
      "userEmail": "string"
    },
    "createdAt": "Date",
    "updatedAt": "Date",
    "properties": {
      "propertyId": {
        "name": "string",
        "type": "PropertyType",
        "options": "PropertyOption[]"
      }
    },
    "viewsType": ["ViewType"]
  },
  "message": "View created successfully"
}
```

### Response (Error - 400/500)
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## 2. Create Property
**Endpoint:** `POST /api/database/createProperty`

Adds a new property to an existing view.

### Request Body
```json
{
  "viewId": "string",
  "name": "string",
  "type": "title" | "text" | "select" | "multi_select" | "relation" | "comments" | "user" | "date" | "checkbox" | "number",
  "options": [
    {
      "id": "string",
      "name": "string",
      "color": "string (optional)"
    }
  ] (optional)
}
```

### Response (Success - 201)
```json
{
  "success": true,
  "property": {
    "name": "string",
    "type": "PropertyType",
    "options": "PropertyOption[]"
  },
  "view": {
    "_id": "ObjectId",
    "title": "string",
    "properties": "Record<string, PropertySchema>",
    "updatedAt": "Date"
  },
  "message": "Property 'PropertyName' added successfully to view 'ViewTitle'"
}
```

---

## 3. Get View
**Endpoint:** `GET /api/database/getView/[id]`

Retrieves a view and all its associated pages/notes.

### URL Parameters
- `id`: The view ID (ObjectId string)

### Response (Success - 200)
```json
{
  "success": true,
  "collection": {
    "viewCollection": {
      "_id": "ObjectId",
      "title": "string",
      "description": "string",
      "properties": "Record<string, PropertySchema>",
      "viewsType": ["ViewType"],
      "createdAt": "Date",
      "updatedAt": "Date"
    },
    "note": [
      {
        "_id": "ObjectId",
        "title": "string",
        "databaseProperties": "Record<string, any>",
        "databaseViewId": "ObjectId",
        "createdAt": "Date",
        "updatedAt": "Date"
      }
    ]
  },
  "message": "Collection retrieved successfully"
}
```

---

## 4. Update Property Value
**Endpoint:** `PUT /api/database/updatePropertyValue`

Updates the value of a specific property for a page in a view.

### Request Body
```json
{
  "viewId": "string",
  "pageId": "string",
  "propertyId": "string",
  "value": "any"
}
```

### Response (Success - 200)
```json
{
  "success": true,
  "page": {
    "_id": "ObjectId",
    "title": "string",
    "databaseProperties": "Record<string, any>",
    "updatedAt": "Date"
  },
  "propertyId": "string",
  "value": "any",
  "updatedAt": "Date",
  "message": "Property 'propertyId' updated successfully for page 'PageTitle'"
}
```

---

## 5. Update Property Name
**Endpoint:** `PUT /api/database/updatePropertySchema`

Updates the name of a property in a view.

### Request Body
```json
{
  "viewId": "string",
  "propertyId": "string",
  "newName": "string"
}
```

### Response (Success - 200)
```json
{
  "success": true,
  "view": {
    "_id": "ObjectId",
    "title": "string",
    "properties": "Record<string, PropertySchema>",
    "updatedAt": "Date"
  },
  "propertyId": "string",
  "oldName": "string",
  "newName": "string",
  "updatedAt": "Date",
  "message": "Property name updated from 'OldName' to 'NewName'"
}
```

---

## 6. Delete Property
**Endpoint:** `DELETE /api/database/deleteProperty`

Removes a property from a view.

### Request Body
```json
{
  "viewId": "string",
  "propertyId": "string"
}
```

### Response (Success - 201)
```json
{
  "success": true,
  "message": "Property deleted successfully"
}
```

---

## 7. Delete View
**Endpoint:** `DELETE /api/database/deleteView`

Deletes a view and all its associated pages/notes.

### Request Body
```json
{
  "viewId": "string"
}
```

### Response (Success - 201)
```json
{
  "success": true,
  "message": "View 'viewId' deleted successfully"
}
```

---

## Data Types

### PropertyType
```typescript
type PropertyType = 
  | "title"
  | "text" 
  | "select"
  | "multi_select"
  | "relation"
  | "comments"
  | "user"
  | "date"
  | "checkbox"
  | "number"
```

### PropertyOption
```typescript
interface PropertyOption {
  id: string;       // internal option id (UUID/string)
  name: string;     // display name ("In Progress", "Done", etc.)
  color?: string;   // optional color
}
```

### PropertySchema
```typescript
interface PropertySchema {
  name: string;                 // "Status", "Assign"
  type: PropertyType;
  options?: PropertyOption[];   // for select/multi_select
}
```

### ViewType
```typescript
type ViewType = "board" | "table" | "list" | "calendar"
```

---

## Error Handling

All APIs return consistent error responses:

### Common Error Status Codes
- `401`: Unauthorized (no valid session)
- `404`: User not found / View not found / Property not found / Page not found
- `400`: Bad request (missing required fields, validation errors)
- `500`: Internal server error

### Error Response Format
```json
{
  "success": false,
  "message": "Human readable error message",
  "error": "Detailed technical error message"
}
```

---

## Usage Examples

### Frontend Integration Examples

#### 1. Creating a Board View
```javascript
const createBoardView = async () => {
  const response = await fetch('/api/database/createView', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspaceId: "workspace123",
      title: "Project Board",
      description: "Track project progress",
      createdBy: {
        userId: "user123",
        userName: "John Doe",
        userEmail: "john@example.com"
      },
      viewsType: ["board"]
    })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('View created:', result.view);
  }
};
```

#### 2. Adding a Status Property
```javascript
const addStatusProperty = async (viewId) => {
  const response = await fetch('/api/database/createProperty', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewId: viewId,
      name: "Status",
      type: "select",
      options: [
        { id: "todo", name: "To Do" },
        { id: "in_progress", name: "In Progress" },
        { id: "done", name: "Done" }
      ]
    })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('Property added:', result.property);
  }
};
```

#### 3. Updating Property Value
```javascript
const updatePropertyValue = async (viewId, pageId, propertyId, value) => {
  const response = await fetch('/api/database/updatePropertyValue', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewId: viewId,
      pageId: pageId,
      propertyId: propertyId,
      value: value
    })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('Property updated:', result.page);
  }
};
```

#### 4. Fetching View Data
```javascript
const getViewData = async (viewId) => {
  const response = await fetch(`/api/database/getView/${viewId}`);
  const result = await response.json();
  
  if (result.success) {
    const { viewCollection, note } = result.collection;
    console.log('View:', viewCollection);
    console.log('Pages:', note);
  }
};
```

---

## Notes for Frontend Developers

1. **Authentication**: All requests must include the session cookie for authentication
2. **ObjectId Handling**: MongoDB ObjectIds are returned as strings in responses
3. **Property IDs**: Property IDs are generated automatically and follow the format `prop_${ObjectId}`
4. **Error Handling**: Always check the `success` field before processing responses
5. **Validation**: Required fields are validated on the server side
6. **Caching**: Consider implementing client-side caching for frequently accessed views
7. **Real-time Updates**: Consider implementing WebSocket connections for real-time collaboration

---

## Changelog

**Today's Updates:**
- ✅ Created comprehensive database view management APIs
- ✅ Added property creation and management
- ✅ Implemented property value updates
- ✅ Added property name updates
- ✅ Created view and property deletion endpoints
- ✅ Added proper error handling and validation
- ✅ Documented all API endpoints with examples
