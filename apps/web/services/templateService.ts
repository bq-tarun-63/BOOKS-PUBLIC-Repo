import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import { INote } from "@/models/types/Note";
import type { INoteWithContent } from "./noteService";
import { IVeiwDatabase, PropertySchema, IDatabaseSource, ViewTypeWithIconAndTitle } from "@/models/types/VeiwDatabase";
import { IImageStatus } from "@/models/types/ImageStatus";
import { IViewType } from "@/models/types/ViewTypes";
import { NoteService } from "./noteService";
import { DatabaseService } from "./databaseService";
import { createOrUpdateFile, getFileContent, octokit, owner, repo } from "@/lib/github/github";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote";
import { adapterForCreateNote } from "@/lib/adapter/adapterForCreateNote";
import { adapterForSaveContent } from "@/lib/adapter/adapterForSaveContent";
import { getAllDescendantNoteIds } from "@/lib/getAllDescendantNoteIds";

interface IdMappings {
  noteIdMap: Map<string, string>;
  viewIdMap: Map<string, string>;
  propertyIdMap: Map<string, string>;
  imageStatusIdMap: Map<string, string>;
  imageUrlMap: Map<string, string>; // Map old image URLs to new URLs
  databaseSourceIdMap: Map<string, string>; // Map old database source IDs to new ones
  viewTypeIdMap: Map<string, string>; // Map old view type IDs to new ones
}

interface TemplateStructure {
  view?: IVeiwDatabase;
  rootNotes: INote[];
  allNotes: INote[];
}

export const TemplateService = {
  /**
   * Discover complete template structure including views in content
   */
  async discoverTemplateStructure(templateId: string): Promise<TemplateStructure> {
    console.log(`🔍 [DISCOVERY] Starting template structure discovery for templateId: ${templateId}`);
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");
    const viewCollection = db.collection<IVeiwDatabase>("viewDatabases");

    // Get template note
    console.log(`🔍 [DISCOVERY] Fetching template note: ${templateId}`);
    const templateNote = await notesCollection.findOne({ _id: new ObjectId(templateId) });
    if (!templateNote) {
      throw new Error("Template note not found");
    }
    console.log(`✅ [DISCOVERY] Template note found: ${templateNote.title} (has databaseViewId: ${templateNote.databaseViewId ? 'yes' : 'no'})`);

    const structure: TemplateStructure = {
      rootNotes: [],
      allNotes: [],
    };

    // If template has a database view, get it and all notes in that view
    if (templateNote.databaseViewId) {
      console.log(`🔍 [DISCOVERY] Template has database view: ${templateNote.databaseViewId}`);
      const view = await viewCollection.findOne({ _id: templateNote.databaseViewId });
      if (view) {
        structure.view = view;
        console.log(`✅ [DISCOVERY] Database view found: ${view.title} (noteId: ${view.noteId})`);

        // Get database source ID from view (notes are linked to database source, not view)
        let databaseSourceId: ObjectId | null = null;
        if (view.viewsType && view.viewsType.length > 0) {
          const sourceId = view.viewsType[0]?.databaseSourceId;
          databaseSourceId = sourceId || null;
          console.log(`📦 [DISCOVERY] Database source ID: ${databaseSourceId}`);
        }

        // Get all notes in this database source (not view)
        console.log(`🔍 [DISCOVERY] Fetching all notes in database source...`);
        let databaseNotes: INote[] = [];
        if (databaseSourceId) {
          databaseNotes = await notesCollection
            .find({ databaseViewId: databaseSourceId })
            .toArray();
        } else {
          // Fallback: try with view ID (for backward compatibility)
          console.log(`⚠️ [DISCOVERY] No database source ID, using view ID as fallback`);
          databaseNotes = await notesCollection
            .find({ databaseViewId: templateNote.databaseViewId })
            .toArray();
        }

        console.log(`✅ [DISCOVERY] Found ${databaseNotes.length} notes in database source`);
        structure.rootNotes = databaseNotes;
        structure.allNotes = [...databaseNotes];
        
        // Also include the template note itself in allNotes (needed for noteId mapping in view)
        if (!structure.allNotes.find((n) => String(n._id) === String(templateNote._id))) {
          structure.allNotes.push(templateNote);
          console.log(`📝 [DISCOVERY] Added template note to allNotes for noteId mapping`);
        }

        // Get all descendants for each root note
        console.log(`🔍 [DISCOVERY] Finding descendants for ${databaseNotes.length} root notes...`);
        for (const rootNote of databaseNotes) {
          const descendants = await getAllDescendantNoteIds(new ObjectId(rootNote._id!));
          console.log(`  📄 Note ${rootNote.title} has ${descendants.length} descendants`);
          for (const descId of descendants) {
            const descNote = await notesCollection.findOne({ _id: descId });
            if (descNote && !structure.allNotes.find((n) => String(n._id) === String(descId))) {
              structure.allNotes.push(descNote);
            }
          }
        }
        console.log(`✅ [DISCOVERY] Total notes discovered: ${structure.allNotes.length}`);
      }
    } else {
      // If no database view, treat template note as root
      console.log(`🔍 [DISCOVERY] No database view - treating template note as root`);
      structure.rootNotes = [templateNote];
      structure.allNotes = [templateNote];

      // Get all descendants
      console.log(`🔍 [DISCOVERY] Finding descendants for template note...`);
      const descendants = await getAllDescendantNoteIds(new ObjectId(templateId));
      console.log(`  📄 Template note has ${descendants.length} descendants`);
      for (const descId of descendants) {
        const descNote = await notesCollection.findOne({ _id: descId });
        if (descNote) {
          structure.allNotes.push(descNote);
        }
      }
      console.log(`✅ [DISCOVERY] Total notes discovered: ${structure.allNotes.length}`);
    }

    // Discover all viewIds referenced in content of all notes
    console.log(`🔍 [DISCOVERY] Discovering viewIds in content of ${structure.allNotes.length} notes...`);
    const allViewIds = new Set<string>();
    const STORAGE_SYSTEM = process.env.STORAGE_SYSTEM;
    console.log(`📦 [DISCOVERY] Storage system: ${STORAGE_SYSTEM}`);
    
    for (const note of structure.allNotes) {
      try {
        let content: string = "";
        
        if (STORAGE_SYSTEM === "github") {
          // Get content from GitHub
          console.log(`  📄 [DISCOVERY] Getting content from GitHub for note ${note._id}`);
          const fileContent = await getFileContent(note.contentPath);
          content = fileContent.content;
        } else if (STORAGE_SYSTEM === "mongodb") {
          // Get content from MongoDB cluster
          if (note.clusterName) {
            console.log(`  📄 [DISCOVERY] Getting content from MongoDB cluster ${note.clusterName} for note ${note._id}`);
            const { clusterManager } = await import("@/lib/mongoDb/clusterManager");
            const contentClient = await clusterManager.getContentClient(note.clusterName);
            const contentDb = contentClient.db();
            const contentCollection = contentDb.collection("note_content");

            const contentDoc = await contentCollection.findOne({
              noteId: String(note._id),
            });

            if (contentDoc && contentDoc.content) {
              content =
                typeof contentDoc.content === "string"
                  ? contentDoc.content
                  : JSON.stringify(contentDoc.content);
              console.log(`  ✅ [DISCOVERY] Content found for note ${note._id}`);
            } else {
              console.log(`  ⚠️ [DISCOVERY] No content found for note ${note._id}`);
            }
          } else {
            // Fallback: try to get via adapterForGetNote
            console.log(`  📄 [DISCOVERY] No clusterName, using adapterForGetNote for note ${note._id}`);
            const noteWithContent = await adapterForGetNote({ id: String(note._id), includeContent: true });
            content = noteWithContent.content || "";
          }
        }

        if (content) {
          const contentObj = typeof content === "string" ? JSON.parse(content) : content;
          const beforeCount = allViewIds.size;
          TemplateService.discoverViewIdsInContent(contentObj, allViewIds);
          const afterCount = allViewIds.size;
          if (afterCount > beforeCount) {
            console.log(`  🔍 [DISCOVERY] Found ${afterCount - beforeCount} new viewId(s) in note ${note._id}`);
          }
        }
      } catch (error) {
        // Content might not exist, that's okay
        console.warn(`  ⚠️ [DISCOVERY] Could not read content for note ${note._id} to discover viewIds:`, error);
      }
    }
    console.log(`✅ [DISCOVERY] Total viewIds found in content: ${allViewIds.size}`);
    if (allViewIds.size > 0) {
      console.log(`  📋 [DISCOVERY] ViewIds: ${Array.from(allViewIds).join(", ")}`);
    }

    // Get all views referenced in content and add them to structure
    // Note: We'll clone these views during the cloning process
    for (const viewId of allViewIds) {
      if (!structure.view || String(structure.view._id) !== viewId) {
        // This is an inline view in content, will be cloned separately
        // We'll handle it in transformContentNodes
      }
    }

    return structure;
  },

  /**
   * Create ID mappings for all entities
   */
  createIdMappings(structure: TemplateStructure): IdMappings {
    console.log(`🗺️ [MAPPING] Creating ID mappings...`);
    const mappings: IdMappings = {
      noteIdMap: new Map(),
      viewIdMap: new Map(),
      propertyIdMap: new Map(),
      imageStatusIdMap: new Map(),
      imageUrlMap: new Map(),
      databaseSourceIdMap: new Map(),
      viewTypeIdMap: new Map(),
    };

    // Map view ID
    if (structure.view?._id) {
      const newViewId = new ObjectId().toString();
      mappings.viewIdMap.set(String(structure.view._id), newViewId);
      console.log(`  🗺️ [MAPPING] View: ${structure.view._id} → ${newViewId}`);
    }

    // Map database source ID and view type IDs if view exists
    // Also map property IDs from the database source
    if (structure.view?.viewsType && structure.view.viewsType.length > 0) {
        // Get database source ID from first view type (all should reference same source)
        const oldDatabaseSourceId = structure.view.viewsType[0]?.databaseSourceId;
        if (oldDatabaseSourceId) {
          const newDatabaseSourceId = new ObjectId().toString();
          mappings.databaseSourceIdMap.set(String(oldDatabaseSourceId), newDatabaseSourceId);
          console.log(`  🗺️ [MAPPING] DatabaseSource: ${oldDatabaseSourceId} → ${newDatabaseSourceId}`);
        
          // Map property IDs from the database source (async - we'll do this in cloneDatabaseView)
          // For now, we'll create the mapping structure, properties will be mapped during cloning
        }

        // Map all view type IDs (viewType may have _id even though type doesn't include it)
        console.log(`  🗺️ [MAPPING] Mapping ${structure.view.viewsType.length} view types...`);
        for (const viewType of structure.view.viewsType) {
          // ViewTypeWithIconAndTitle may have _id in practice even though type doesn't include it
          const viewTypeWithId = viewType as any;
          if (viewTypeWithId._id) {
            const oldViewTypeId = typeof viewTypeWithId._id === "string" ? viewTypeWithId._id : String(viewTypeWithId._id);
            const newViewTypeId = new ObjectId().toString();
            mappings.viewTypeIdMap.set(oldViewTypeId, newViewTypeId);
            console.log(`    📋 ViewType: ${oldViewTypeId} → ${newViewTypeId} (${viewType.title})`);
          }
        }
    }

    // Map all note IDs
    console.log(`  🗺️ [MAPPING] Mapping ${structure.allNotes.length} notes...`);
    for (const note of structure.allNotes) {
      if (note._id) {
        const newNoteId = new ObjectId().toString();
        mappings.noteIdMap.set(String(note._id), newNoteId);
        console.log(`    📄 Note: ${note._id} → ${newNoteId} (${note.title})`);
      }
      if (note.imageStatusId) {
        const newImageStatusId = new ObjectId().toString();
        mappings.imageStatusIdMap.set(
          String(note.imageStatusId),
          newImageStatusId,
        );
        console.log(`    🖼️ ImageStatus: ${note.imageStatusId} → ${newImageStatusId}`);
      }
    }

    // Note: Properties are now in IDatabaseSource, not IVeiwDatabase
    // We'll map them when we clone the database source

    console.log(`✅ [MAPPING] ID mappings created:`);
    console.log(`  - Notes: ${mappings.noteIdMap.size}`);
    console.log(`  - Views: ${mappings.viewIdMap.size}`);
    console.log(`  - DatabaseSources: ${mappings.databaseSourceIdMap.size}`);
    console.log(`  - ViewTypes: ${mappings.viewTypeIdMap.size}`);
    console.log(`  - Properties: ${mappings.propertyIdMap.size}`);
    console.log(`  - ImageStatuses: ${mappings.imageStatusIdMap.size}`);
    return mappings;
  },

  /**
   * Clone database view with new database source, view types, and property IDs
   */
  async cloneDatabaseView(
    oldView: IVeiwDatabase,
    mappings: IdMappings,
    userId: string,
    userEmail: string,
    userName: string,
    workspaceId: string,
    organizationDomain: string,
  ): Promise<string> {
    console.log(`🔄 [CLONE VIEW] Cloning database view: ${oldView._id} (${oldView.title})`);
    const client = await clientPromise();
    const db = client.db();
    const viewCollection = db.collection<IVeiwDatabase>("viewDatabases");
    const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");
    const viewTypesCollection = db.collection<IViewType>("viewTypes");

    const newViewId = mappings.viewIdMap.get(String(oldView._id));
    if (!newViewId) {
      throw new Error("View ID mapping not found");
    }
    console.log(`  🆔 [CLONE VIEW] New view ID: ${newViewId}`);

    // Step 1: Get the old database source
    if (!oldView.viewsType || oldView.viewsType.length === 0) {
      throw new Error("View has no database source");
    }
    
    const oldDatabaseSourceId = oldView.viewsType[0]?.databaseSourceId;
    if (!oldDatabaseSourceId) {
      throw new Error("Database source ID not found in view");
    }

    console.log(`  📦 [CLONE VIEW] Getting old database source: ${oldDatabaseSourceId}`);
    const oldDatabaseSource = await databaseSourcesCollection.findOne({
      _id: oldDatabaseSourceId instanceof ObjectId ? oldDatabaseSourceId : new ObjectId(String(oldDatabaseSourceId)),
    });

    if (!oldDatabaseSource) {
      throw new Error("Old database source not found");
    }
    console.log(`  ✅ [CLONE VIEW] Found database source with ${Object.keys(oldDatabaseSource.properties || {}).length} properties`);

    // Step 2: Clone database source with new property IDs
    const newDatabaseSourceId = mappings.databaseSourceIdMap.get(String(oldDatabaseSourceId));
    if (!newDatabaseSourceId) {
      throw new Error("Database source ID mapping not found");
    }

    console.log(`  📦 [CLONE VIEW] Creating new database source: ${newDatabaseSourceId}`);
    const newProperties: Record<string, PropertySchema> = {};
    
    // Map all properties with new property IDs
    for (const [oldPropId, property] of Object.entries(oldDatabaseSource.properties || {})) {
      const newPropId = mappings.propertyIdMap.get(oldPropId);
      if (newPropId) {
        newProperties[newPropId] = { ...property };
        console.log(`    ✅ Property: ${oldPropId} → ${newPropId} (${property.name})`);
      } else {
        // If property not in mapping, create a new ID for it
        const fallbackPropId = `prop_${new ObjectId()}`;
        mappings.propertyIdMap.set(oldPropId, fallbackPropId);
        newProperties[fallbackPropId] = { ...property };
        console.log(`    ➕ Property: ${oldPropId} → ${fallbackPropId} (${property.name}) - created new mapping`);
      }
    }

    const newDatabaseSource: IDatabaseSource = {
      _id: new ObjectId(newDatabaseSourceId),
      title: oldDatabaseSource.title || "Cloned DataSource",
      createdBy: {
        userId: new ObjectId(userId),
        userName,
        userEmail,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      properties: newProperties,
      settings: oldDatabaseSource.settings || {},
      workspaceId: workspaceId || oldDatabaseSource.workspaceId,
      isSprint: oldDatabaseSource.isSprint || false,
    };

    await databaseSourcesCollection.insertOne(newDatabaseSource);
    console.log(`  ✅ [CLONE VIEW] Database source created: ${newDatabaseSourceId}`);

    // Step 3: Clone view types and create entries in viewTypes collection
    console.log(`  📋 [CLONE VIEW] Cloning ${oldView.viewsType.length} view types...`);
    const newViewsType = oldView.viewsType.map((oldViewType) => {
      // ViewTypeWithIconAndTitle may have _id in practice even though type doesn't include it
      const oldViewTypeWithId = oldViewType as any;
      const oldViewTypeId = oldViewTypeWithId._id 
        ? (typeof oldViewTypeWithId._id === "string" ? oldViewTypeWithId._id : String(oldViewTypeWithId._id))
        : null;
      
      const newViewTypeId = oldViewTypeId 
        ? mappings.viewTypeIdMap.get(oldViewTypeId) || new ObjectId().toString()
        : new ObjectId().toString();

      if (oldViewTypeId && !mappings.viewTypeIdMap.has(oldViewTypeId)) {
        mappings.viewTypeIdMap.set(oldViewTypeId, newViewTypeId);
      }

      return {
        _id: new ObjectId(newViewTypeId),
        viewType: oldViewType.viewType,
        icon: oldViewType.icon,
        title: oldViewType.title,
        databaseSourceId: new ObjectId(newDatabaseSourceId),
      } as ViewTypeWithIconAndTitle & { _id: ObjectId };
    });

    // Step 4: Create view types in viewTypes collection
    const viewTypesToInsert: IViewType[] = newViewsType.map(vt => ({
      _id: vt._id,
      viewType: vt.viewType,
      icon: vt.icon,
      title: vt.title,
      databaseSourceId: vt.databaseSourceId,
      viewDatabaseId: new ObjectId(newViewId),
      settings: {}
    }));

    if (viewTypesToInsert.length > 0) {
      await viewTypesCollection.insertMany(viewTypesToInsert);
      console.log(`  ✅ [CLONE VIEW] Created ${viewTypesToInsert.length} view types in viewTypes collection`);
    }

    // Step 5: Map old noteId to new noteId (the note that owns/contains this database view)
    let newNoteId = "";
    if (oldView.noteId) {
      console.log(`  📄 [CLONE VIEW] Mapping noteId: ${oldView.noteId}`);
      const mappedNoteId = mappings.noteIdMap.get(oldView.noteId);
      if (mappedNoteId) {
        newNoteId = mappedNoteId;
        console.log(`    ✅ Mapped to: ${newNoteId}`);
      } else {
        console.warn(
          `    ⚠️ NoteId ${oldView.noteId} not found in mappings for view ${oldView._id}. Using empty string.`,
        );
        newNoteId = "";
      }
    } else {
      console.log(`  📄 [CLONE VIEW] No noteId in view, using empty string`);
    }

    // Step 6: Create new view with updated references
    const newView: IVeiwDatabase = {
      _id: new ObjectId(newViewId),
      title: oldView.title,
      noteId: newNoteId,
      createdBy: {
        userId: new ObjectId(userId),
        userName,
        userEmail,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      viewsType: newViewsType, // Updated with new IDs and databaseSourceId
      workspaceId: workspaceId || oldView.workspaceId,
      organizationDomain: organizationDomain || oldView.organizationDomain,
      isSprint: oldView.isSprint || false,
    };

    console.log(`  💾 [CLONE VIEW] Inserting new view into database...`);
    await viewCollection.insertOne(newView);
    console.log(`  ✅ [CLONE VIEW] View cloned successfully: ${newViewId}`);
    console.log(`  📦 [CLONE VIEW] New database source ID: ${newDatabaseSourceId}`);

    return newViewId;
  },

  /**
   * Copy all images from old note directory to new note directory
   */
  async copyNoteImages(oldNoteId: string, newNoteId: string): Promise<void> {
    try {
      const oldImageDir = `docs/notes/${oldNoteId}/images`;
      const newImageDir = `docs/notes/${newNoteId}/images`;

      // List all files in old image directory
      try {
        const response = await octokit.rest.repos.getContent({
          owner: owner as string,
          repo: repo as string,
          path: oldImageDir,
        });

        if (!Array.isArray(response.data)) {
          return; // Not a directory or doesn't exist
        }

        // Copy each image file
        for (const file of response.data) {
          if (file.type === "file" && file.path) {
            // Get file content
            const fileResponse = await octokit.rest.repos.getContent({
              owner: owner as string,
              repo: repo as string,
              path: file.path,
            });

            if (Array.isArray(fileResponse.data) || fileResponse.data.type !== "file") {
              continue;
            }

            const fileName = file.name;

            // Upload to new location (fileResponse.data.content is already base64)
            const newFilePath = `${newImageDir}/${fileName}`;
            await createOrUpdateFile({
              path: newFilePath,
              content: fileResponse.data.content,
              message: `Copy image from template: ${fileName}`,
            });
          }
        }
      } catch (error: any) {
        // Directory doesn't exist or no images - that's okay
        if (error.status !== 404) {
          console.error(`Error copying images for note ${oldNoteId}:`, error);
        }
      }
    } catch (error) {
      console.error(`Failed to copy images from ${oldNoteId} to ${newNoteId}:`, error);
      // Don't throw - images are optional
    }
  },

  /**
   * Download image from URL and return as base64
   */
  async downloadImage(url: string): Promise<{ content: string; filename: string } | null> {
    console.log(`  📥 [DOWNLOAD IMAGE] Downloading image from: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`  ⚠️ [DOWNLOAD IMAGE] Failed to download image from ${url}: ${response.statusText}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Content = buffer.toString("base64");

      // Extract filename from URL or generate one
      const urlPath = new URL(url).pathname;
      const filename = urlPath.split("/").pop() || `image-${Date.now()}.png`;
      console.log(`  ✅ [DOWNLOAD IMAGE] Downloaded image: ${filename} (${buffer.length} bytes)`);

      return { content: base64Content, filename };
    } catch (error) {
      console.error(`  ❌ [DOWNLOAD IMAGE] Error downloading image from ${url}:`, error);
      return null;
    }
  },

  /**
   * Upload image to GitHub and return new URL
   */
  async uploadImageToGitHub(
    imageData: { content: string; filename: string },
    newNoteId: string,
  ): Promise<string> {
    console.log(`  📤 [UPLOAD IMAGE] Uploading image ${imageData.filename} for note ${newNoteId}`);
    try {
      const newImagePath = `docs/notes/${newNoteId}/images/${imageData.filename}-${crypto.randomUUID()}`;
      await createOrUpdateFile({
        path: newImagePath,
        content: imageData.content,
        message: `Copy image from template: ${imageData.filename}`,
      });

      const newUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${newImagePath}`;
      console.log(`  ✅ [UPLOAD IMAGE] Uploaded to: ${newUrl}`);
      return newUrl;
    } catch (error) {
      console.error(`  ❌ [UPLOAD IMAGE] Error uploading image to GitHub:`, error);
      throw error;
    }
  },

  /**
   * Discover all viewIds referenced in content (recursive)
   */
  discoverViewIdsInContent(content: any, viewIds: Set<string> = new Set(), depth: number = 0): Set<string> {
    if (!content || typeof content !== "object") {
      return viewIds;
    }

    // Handle TipTap content structure with online_content wrapper
    if (content.online_content) {
      return TemplateService.discoverViewIdsInContent(content.online_content, viewIds, depth + 1);
    }

    // Check for reactComponentBlock with viewId
    if (content.type === "reactComponentBlock") {
      console.log(`    🔍 [DISCOVER VIEW] Found reactComponentBlock node at depth ${depth}`, {
        hasAttrs: !!content.attrs,
        attrs: content.attrs,
      });
      
      if (content.attrs?.viewId) {
        // Convert viewId to string (it might be ObjectId or string)
        const viewId = String(content.attrs.viewId);
        if (viewId && viewId !== "null" && viewId !== "undefined" && !viewIds.has(viewId)) {
          viewIds.add(viewId);
          console.log(`    ✅ [DISCOVER VIEW] Found reactComponentBlock with viewId: ${viewId}`);
        } else {
          console.log(`    ⚠️ [DISCOVER VIEW] viewId is invalid or already exists: ${viewId}`);
        }
      } else {
        console.log(`    ⚠️ [DISCOVER VIEW] reactComponentBlock has no viewId in attrs`);
      }
    }

    // Recursively check content array
    if (Array.isArray(content.content)) {
      for (const child of content.content) {
        TemplateService.discoverViewIdsInContent(child, viewIds, depth + 1);
      }
    }

    // Recursively check nested objects (but limit depth to avoid infinite recursion)
    if (depth < 10) {
      for (const [key, value] of Object.entries(content)) {
        // Skip already processed keys
        if (key === "online_content" || key === "content" || key === "type" || key === "attrs") {
          continue;
        }
        
        if (typeof value === "object" && value !== null) {
          if (Array.isArray(value)) {
            for (const item of value) {
              TemplateService.discoverViewIdsInContent(item, viewIds, depth + 1);
            }
          } else {
            TemplateService.discoverViewIdsInContent(value, viewIds, depth + 1);
          }
        }
      }
    }

    return viewIds;
  },

  /**
   * Recursively traverse and transform ProseMirror content nodes
   */
  async transformContentNodes(
    node: any,
    mappings: IdMappings,
    newNoteId: string,
  ): Promise<any> {
    if (!node || typeof node !== "object") {
      return node;
    }

    // Handle reactComponentBlock - update viewId (view should already be cloned)
    if (node.type === "reactComponentBlock" && node.attrs?.viewId) {
      const oldViewId = node.attrs.viewId;
      const newViewId = mappings.viewIdMap.get(oldViewId);

      if (newViewId) {
        console.log(`    🔄 [TRANSFORM] Updating reactComponentBlock viewId: ${oldViewId} → ${newViewId}`);
        return {
          ...node,
          attrs: {
            ...node.attrs,
            viewId: newViewId,
          },
        };
      }
      // If viewId not in mapping, keep original (shouldn't happen if discovery worked)
      console.warn(`    ⚠️ [TRANSFORM] viewId ${oldViewId} not found in mappings, keeping original`);
      return node;
    }

    // Handle image nodes - download and re-upload
    if (node.type === "image" && node.attrs?.src) {
      const oldImageUrl = node.attrs.src;
      console.log(`    🖼️ [TRANSFORM] Processing image node with src: ${oldImageUrl}`);
      
      // Check if we already processed this image
      let newImageUrl = mappings.imageUrlMap.get(oldImageUrl);
      
      if (!newImageUrl) {
        // Download image
        const imageData = await TemplateService.downloadImage(oldImageUrl);
        if (imageData) {
          // Upload to new location
          newImageUrl = await TemplateService.uploadImageToGitHub(imageData, newNoteId);
          mappings.imageUrlMap.set(oldImageUrl, newImageUrl);
          console.log(`    ✅ [TRANSFORM] Image URL mapped: ${oldImageUrl} → ${newImageUrl}`);
        } else {
          // If download fails, keep original URL
          console.warn(`    ⚠️ [TRANSFORM] Failed to download image, keeping original URL`);
          newImageUrl = oldImageUrl;
        }
      } else {
        console.log(`    ♻️ [TRANSFORM] Image already processed, using cached URL: ${newImageUrl}`);
      }

      return {
        ...node,
        attrs: {
          ...node.attrs,
          src: newImageUrl,
        },
      };
    }

    // Recursively process content array
    if (Array.isArray(node.content)) {
      const transformedContent = await Promise.all(
        node.content.map((child: any) => TemplateService.transformContentNodes(child, mappings, newNoteId)),
      );
      return {
        ...node,
        content: transformedContent,
      };
    }

    // Recursively process nested objects
    const transformed: any = { ...node };
    for (const [key, value] of Object.entries(node)) {
      if (key !== "content" && typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          transformed[key] = await Promise.all(
            value.map((item: any) =>
              typeof item === "object" && item !== null
                ? TemplateService.transformContentNodes(item, mappings, newNoteId)
                : item,
            ),
          );
        } else {
          transformed[key] = await TemplateService.transformContentNodes(value, mappings, newNoteId);
        }
      }
    }

    return transformed;
  },

  /**
   * Transform content by replacing all old IDs with new IDs
   */
  async transformContent(
    content: string,
    mappings: IdMappings,
    newNoteId: string,
  ): Promise<string> {
    console.log(`  🔄 [TRANSFORM] Starting content transformation for note ${newNoteId}`);
    try {
      // Parse JSON content
      const contentObj = typeof content === "string" ? JSON.parse(content) : content;
      console.log(`  📋 [TRANSFORM] Content parsed, has online_content: ${!!contentObj.online_content}`);

      // Handle TipTap content structure with online_content wrapper
      if (contentObj.online_content) {
        console.log(`  🔄 [TRANSFORM] Transforming online_content structure...`);
        // Transform the online_content object
        const transformedOnlineContent = await TemplateService.transformContentNodes(
          contentObj.online_content,
          mappings,
          newNoteId,
        );

        // Return with online_content_time preserved
        const result = JSON.stringify({
          online_content: transformedOnlineContent,
          online_content_time: contentObj.online_content_time || new Date().toISOString(),
        });
        console.log(`  ✅ [TRANSFORM] Content transformation complete`);
        return result;
      }

      // If no online_content wrapper, assume it's direct ProseMirror content
      console.log(`  🔄 [TRANSFORM] Transforming direct ProseMirror content...`);
      // Transform content nodes recursively
      const transformedObj = await TemplateService.transformContentNodes(contentObj, mappings, newNoteId);

      // Convert back to string
      console.log(`  ✅ [TRANSFORM] Content transformation complete`);
      return JSON.stringify(transformedObj);
    } catch (error) {
      console.error("Error transforming content:", error);
      // Fallback to simple string replacement
      let transformed = typeof content === "string" ? content : JSON.stringify(content);

      // Replace note IDs in paths
      for (const [oldId, newId] of mappings.noteIdMap.entries()) {
        // Replace in image paths
        transformed = transformed.replace(
          new RegExp(`docs/notes/${oldId}/images/`, "g"),
          `docs/notes/${newId}/images/`,
        );
        // Replace in content paths
        transformed = transformed.replace(
          new RegExp(`docs/notes/${oldId}\\.json`, "g"),
          `docs/notes/${newId}.json`,
        );
        // Replace note IDs in JSON (if present as references)
        transformed = transformed.replace(
          new RegExp(`"noteId":\\s*"${oldId}"`, "g"),
          `"noteId": "${newId}"`,
        );
        // Replace in URLs
        transformed = transformed.replace(
          new RegExp(`/notes/${oldId}`, "g"),
          `/notes/${newId}`,
        );
      }

      // Replace view IDs in reactComponentBlock
      for (const [oldViewId, newViewId] of mappings.viewIdMap.entries()) {
        transformed = transformed.replace(
          new RegExp(`"viewId":\\s*"${oldViewId}"`, "g"),
          `"viewId": "${newViewId}"`,
        );
      }

      // Replace image URLs
      for (const [oldUrl, newUrl] of mappings.imageUrlMap.entries()) {
        transformed = transformed.replace(
          new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          newUrl,
        );
      }

      // Replace property IDs in content (for formulas, references, etc.)
      for (const [oldPropId, newPropId] of mappings.propertyIdMap.entries()) {
        transformed = transformed.replace(
          new RegExp(oldPropId, "g"),
          newPropId,
        );
      }

      return transformed;
    }
  },

  /**
   * Get and transform note content for cloning
   * Handles both GitHub and MongoDB storage systems
   */
  async getAndTransformContent(
    oldNote: INote,
    newNoteId: string,
    mappings: IdMappings,
  ): Promise<string> {
    console.log(`📄 [GET CONTENT] Getting content for note ${oldNote._id} → ${newNoteId}`);
    try {
      const STORAGE_SYSTEM = process.env.STORAGE_SYSTEM;
      let oldContent: string = "";

      if (STORAGE_SYSTEM === "github") {
        // Get content from GitHub
        console.log(`  📦 [GET CONTENT] Getting from GitHub: ${oldNote.contentPath}`);
        const { content } = await getFileContent(oldNote.contentPath);
        oldContent = content;
        console.log(`  ✅ [GET CONTENT] Content retrieved from GitHub (${content.length} chars)`);
      } else if (STORAGE_SYSTEM === "mongodb") {
        // Get content from MongoDB cluster
        if (oldNote.clusterName) {
          console.log(`  📦 [GET CONTENT] Getting from MongoDB cluster: ${oldNote.clusterName}`);
          const { clusterManager } = await import("@/lib/mongoDb/clusterManager");
          const contentClient = await clusterManager.getContentClient(oldNote.clusterName);
          const contentDb = contentClient.db();
          const contentCollection = contentDb.collection("note_content");

          const contentDoc = await contentCollection.findOne({
            noteId: String(oldNote._id),
          });

          if (contentDoc && contentDoc.content) {
            // Content might be stored as string or object
            oldContent =
              typeof contentDoc.content === "string"
                ? contentDoc.content
                : JSON.stringify(contentDoc.content);
            console.log(`  ✅ [GET CONTENT] Content retrieved from MongoDB (${oldContent.length} chars)`);
          } else {
            console.warn(
              `  ⚠️ [GET CONTENT] No content found in MongoDB cluster ${oldNote.clusterName} for note ${oldNote._id}`,
            );
            oldContent = "";
          }
        } else {
          // Fallback: try to get via adapterForGetNote
          console.log(`  📦 [GET CONTENT] No clusterName, using adapterForGetNote`);
          const noteWithContent = await adapterForGetNote({ id: String(oldNote._id), includeContent: true });
          oldContent = noteWithContent.content || "";
          console.log(`  ✅ [GET CONTENT] Content retrieved via adapter (${oldContent.length} chars)`);
        }
      } else {
        throw new Error("Storage system not configured");
      }

      // If no content found, return default empty content
      if (!oldContent || oldContent.trim() === "") {
        console.warn(`  ⚠️ [GET CONTENT] No content found for note ${oldNote._id}, using default empty content`);
        return JSON.stringify(
          {
            online_content: { type: "doc", content: [] },
            online_content_time: new Date().toISOString(),
          },
          null,
          2,
        );
      }

      // Transform content (now async to handle image downloads and view cloning)
      console.log(`  🔄 [GET CONTENT] Transforming content...`);
      const newContent = await TemplateService.transformContent(oldContent, mappings, newNoteId);
      console.log(`  ✅ [GET CONTENT] Content transformed successfully (${newContent.length} chars)`);

      return newContent;
    } catch (error) {
      console.error(`  ❌ [GET CONTENT] Failed to get content for note ${oldNote._id}:`, error);
      // Return default empty content if original doesn't exist
      return JSON.stringify(
        {
          online_content: { type: "doc", content: [] },
          online_content_time: new Date().toISOString(),
        },
        null,
        2,
      );
    }
  },

  /**
   * Map database properties to new property IDs
   */
  mapDatabaseProperties(
    oldProperties: Record<string, any> | undefined,
    mappings: IdMappings,
  ): Record<string, any> | undefined {
    if (!oldProperties) return undefined;

    const newDatabaseProperties: Record<string, any> = {};
    for (const [oldPropId, value] of Object.entries(oldProperties)) {
      const newPropId = mappings.propertyIdMap.get(oldPropId);
      if (newPropId) {
        newDatabaseProperties[newPropId] = value;
      } else {
        // Keep old property ID if not in mapping (shouldn't happen, but safety)
        newDatabaseProperties[oldPropId] = value;
      }
    }
    return newDatabaseProperties;
  },

  /**
   * Clone a single note document (DEPRECATED - now using adapterForCreateNote)
   */
  async cloneNoteDocument(
    oldNote: INote,
    newNoteId: string,
    newParentId: string | null,
    newRootParentId: string | undefined,
    mappings: IdMappings,
    userId: string,
    userEmail: string,
    workspaceId: string,
    organizationDomain: string,
    newDatabaseViewId?: string,
    isPublicNote?: boolean,
    isRestrictedPage?: boolean,
  ): Promise<INote> {
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");

    const newImageStatusId = mappings.imageStatusIdMap.get(String(oldNote.imageStatusId || ""));
    const newImageStatusIdObj = newImageStatusId ? new ObjectId(newImageStatusId) : new ObjectId();

    // Map database properties if they exist
    let newDatabaseProperties: Record<string, any> | undefined;
    if (oldNote.databaseProperties) {
      newDatabaseProperties = {};
      for (const [oldPropId, value] of Object.entries(oldNote.databaseProperties)) {
        const newPropId = mappings.propertyIdMap.get(oldPropId);
        if (newPropId) {
          newDatabaseProperties[newPropId] = value;
        } else {
          // Keep old property ID if not in mapping (shouldn't happen, but safety)
          newDatabaseProperties[oldPropId] = value;
        }
      }
    }

    const newNote: INote = {
      _id: new ObjectId(newNoteId),
      title: oldNote.title,
      userId: new ObjectId(userId),
      userEmail,
      parentId: newParentId,
      contentPath: `docs/notes/${newNoteId}.json`,
      commitSha: "", // Will be set after content is cloned
      createdAt: new Date(),
      updatedAt: new Date(),
      order: oldNote.order || 0,
      children: [],
      icon: oldNote.icon || "",
      coverUrl: oldNote.coverUrl || null,
      isPublish: false,
      isPublic: 0,
      sharedWith: [],
      approvalStatus: "Publish",
      isPublicNote: isPublicNote !== undefined ? isPublicNote : oldNote.isPublicNote || false,
      isRestrictedPage: isRestrictedPage !== undefined ? isRestrictedPage : oldNote.isRestrictedPage || false,
      isTemplate: false, // Cloned notes are never templates
      rootParentId: newRootParentId,
      tree: undefined, // Will be rebuilt
      imageStatusId: newImageStatusIdObj,
      noteType: oldNote.noteType || "original",
      organizationDomain,
      workspaceId,
      databaseProperties: newDatabaseProperties,
      databaseViewId: newDatabaseViewId ? new ObjectId(newDatabaseViewId) : undefined,
      databaseNoteId: undefined, // Reset database note reference
      workAreaId: oldNote.workAreaId || "",
    };

    return newNote;
  },

  /**
   * Create image status record for cloned note
   */
  async createImageStatus(newNoteId: string, newImageStatusId: string): Promise<void> {
    console.log(`  🖼️ [IMAGE STATUS] Creating image status for note ${newNoteId} with ID ${newImageStatusId}`);
    const client = await clientPromise();
    const db = client.db();
    const imageStatusCollection = db.collection<IImageStatus>("imageStatus");

    const imageStatus: IImageStatus = {
      _id: new ObjectId(newImageStatusId),
      originalNoteId: new ObjectId(newNoteId),
      imageUrl: `docs/notes/${newNoteId}/images/`,
      isCreatedUsed: true,
      isPublishedUsed: false,
      isApprovedUsed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      noteType: "original",
    };

    await imageStatusCollection.insertOne(imageStatus);
    console.log(`  ✅ [IMAGE STATUS] Image status created successfully`);
  },

  /**
   * Recursively clone a note and all its children
   * Follows the same pattern as createNote API: Create note → Transform content → Save content
   */
  async cloneNoteRecursive(
    oldNote: INote,
    newParentId: string | null,
    newRootParentId: string | undefined,
    mappings: IdMappings,
    userId: string,
    userEmail: string,
    userName: string,
    workspaceId: string,
    organizationDomain: string,
    newDatabaseSourceId?: string, // Changed from newDatabaseViewId to newDatabaseSourceId
    isPublicNote?: boolean,
    isRestrictedPage?: boolean,
  ): Promise<INote> {
    const newNoteId = mappings.noteIdMap.get(String(oldNote._id));
    if (!newNoteId) {
      throw new Error(`Note ID mapping not found for ${oldNote._id}`);
    }
    console.log(`\n🔄 [CLONE NOTE] Cloning note: ${oldNote._id} → ${newNoteId}`);
    console.log(`  📄 Title: ${oldNote.title}`);
    console.log(`  👤 Parent: ${newParentId || "none (root)"}`);
    console.log(`  🗄️ Database Source: ${newDatabaseSourceId || "none"}`);

    // Step 1: Get parent note if parentId exists (for access control and metadata)
    console.log(`  📋 [CLONE NOTE] Step 1: Getting parent note...`);
    let parentNote: INote | undefined;
    if (newParentId) {
      try {
        parentNote = await adapterForGetNote({ id: newParentId, includeContent: false });
        console.log(`  ✅ [CLONE NOTE] Parent note found: ${parentNote.title}`);
      } catch (error) {
        console.warn(`  ⚠️ [CLONE NOTE] Could not get parent note ${newParentId}:`, error);
      }
    } else {
      console.log(`  ℹ️ [CLONE NOTE] No parent (root note)`);
    }

    // Step 2: Map database properties to new property IDs
    console.log(`  📋 [CLONE NOTE] Step 2: Mapping database properties...`);
    const newDatabaseProperties = TemplateService.mapDatabaseProperties(
      oldNote.databaseProperties,
      mappings,
    );
    if (newDatabaseProperties) {
      console.log(`  ✅ [CLONE NOTE] Mapped ${Object.keys(newDatabaseProperties).length} database properties`);
    }

    // Step 3: Create new note using adapterForCreateNote (like createNote API)
    console.log(`  📋 [CLONE NOTE] Step 3: Creating note using adapterForCreateNote...`);
    // This ensures proper storage system handling (GitHub/MongoDB) and metadata setup
    const createdNoteResult = await adapterForCreateNote({
      noteId: newNoteId,
      title: oldNote.title,
      userId,
      userEmail,
      userName,
      parentId: newParentId,
      icon: oldNote.icon || undefined,
      isPublicNote: isPublicNote !== undefined ? isPublicNote : oldNote.isPublicNote || false,
      isRestrictedPage: isRestrictedPage !== undefined ? isRestrictedPage : oldNote.isRestrictedPage || false,
      parentNote,
      organizationDomain,
      workspaceId,
      databaseViewId: newDatabaseSourceId, // Pass database source ID (not view ID) - notes are linked to source
      databaseProperties:undefined, // prop_value - not used for cloned notes
      databaseNoteId: undefined, // databaseNoteId - reset for cloned notes
      workAreaId: oldNote.workAreaId || undefined,
      isTemplate: false, // isTemplate - cloned notes are never templates
    });

    // Extract the created note (adapterForCreateNote may return single note or parent/child pair)
    const createdNote =
      "parent" in createdNoteResult ? createdNoteResult.child : createdNoteResult;
    console.log(`  ✅ [CLONE NOTE] Note created successfully via adapter`);

    // Step 4: Update note with additional metadata that wasn't set by adapterForCreateNote
    console.log(`  📋 [CLONE NOTE] Step 4: Updating additional metadata...`);
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");

    // Get the image status ID mapping
    const newImageStatusId = mappings.imageStatusIdMap.get(String(oldNote.imageStatusId || ""));
    const newImageStatusIdObj = newImageStatusId ? new ObjectId(newImageStatusId) : new ObjectId();

    // Update note with cloned-specific metadata
    // Note: databaseViewId should be the databaseSourceId (already set by adapterForCreateNote if provided)
    // But we'll ensure it's set correctly here
    const updateDoc: any = {
      rootParentId: newRootParentId ? new ObjectId(newRootParentId) : undefined,
      order: oldNote.order || 0,
      coverUrl: oldNote.coverUrl || null,
      databaseProperties: newDatabaseProperties,
      formulaErrors: oldNote.formulaErrors || undefined,
      imageStatusId: newImageStatusIdObj,
      noteType: oldNote.noteType || "original",
    };

    // Set databaseViewId to the database source ID (not view ID)
    if (newDatabaseSourceId) {
      updateDoc.databaseViewId = new ObjectId(newDatabaseSourceId);
      console.log(`  🗄️ [CLONE NOTE] Setting databaseViewId to database source: ${newDatabaseSourceId}`);
    }

    await notesCollection.updateOne(
      { _id: new ObjectId(newNoteId) },
      { $set: updateDoc },
    );
    console.log(`  ✅ [CLONE NOTE] Metadata updated`);

    // Step 5: Copy images from old note to new note
    console.log(`  📋 [CLONE NOTE] Step 5: Copying images...`);
    await TemplateService.copyNoteImages(String(oldNote._id), newNoteId);

    // Step 6: Create image status record
    console.log(`  📋 [CLONE NOTE] Step 6: Creating image status...`);
    if (newImageStatusId) {
      await TemplateService.createImageStatus(newNoteId, newImageStatusId);
    }

    // Step 7: Get and transform content (detach all links, create new ones)
    console.log(`  📋 [CLONE NOTE] Step 7: Getting and transforming content...`);
    const transformedContent = await TemplateService.getAndTransformContent(
      oldNote,
      newNoteId,
      mappings,
    );

    // Step 8: Save transformed content using adapterForSaveContent (like uploadContent API)
    console.log(`  📋 [CLONE NOTE] Step 8: Saving content using adapterForSaveContent...`);
    // This ensures proper storage system handling and version tracking
    const updatedNote = await adapterForGetNote({ id: newNoteId, includeContent: false });
    const { sha, updatedAt } = await adapterForSaveContent({
      note: updatedNote,
      fileContent: transformedContent,
      userName,
    });
    console.log(`  ✅ [CLONE NOTE] Content saved (sha: ${sha})`);

    // Step 9: Update note with commit SHA
    console.log(`  📋 [CLONE NOTE] Step 9: Updating commit SHA...`);
    await notesCollection.updateOne(
      { _id: new ObjectId(newNoteId) },
      {
        $set: {
          commitSha: sha,
          updatedAt: updatedAt,
        },
      },
    );
    console.log(`  ✅ [CLONE NOTE] Commit SHA updated`);

    // Step 10: Get full old note with children to clone them
    console.log(`  📋 [CLONE NOTE] Step 10: Getting children...`);
    const fullOldNote = await adapterForGetNote({ id: String(oldNote._id), includeContent: false });

    // Step 11: Recursively clone children
    if (fullOldNote.children && fullOldNote.children.length > 0) {
      console.log(`  👶 [CLONE NOTE] Found ${fullOldNote.children.length} children, cloning recursively...`);
      for (const childRef of fullOldNote.children) {
        // Get the actual child note from database using the old child ID
        const oldChildNote = await notesCollection.findOne({ _id: new ObjectId(childRef._id) });
        if (oldChildNote) {
          console.log(`    👶 [CLONE NOTE] Cloning child: ${oldChildNote.title}`);
          await TemplateService.cloneNoteRecursive(
            oldChildNote,
            newNoteId,
            newRootParentId || newNoteId,
            mappings,
            userId,
            userEmail,
            userName,
            workspaceId,
            organizationDomain,
            newDatabaseSourceId, // Pass database source ID (not view ID)
            isPublicNote,
            isRestrictedPage,
          );
        }
      }
      console.log(`  ✅ [CLONE NOTE] All children cloned`);
    } else {
      console.log(`  ℹ️ [CLONE NOTE] No children to clone`);
    }

    // Return the updated note
    console.log(`  ✅ [CLONE NOTE] Note cloning complete: ${newNoteId}`);
    const finalNote = await adapterForGetNote({ id: newNoteId, includeContent: false });
    return finalNote;
  },

  /**
   * Update parent references and tree structures
   */
  async updateRelationships(mappings: IdMappings, structure: TemplateStructure): Promise<void> {
    console.log(`🔗 [UPDATE RELATIONSHIPS] Updating relationships for ${structure.allNotes.length} notes...`);
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");

    // Update all parent references and children arrays
    console.log(`  🔄 [UPDATE RELATIONSHIPS] Updating parent/child references...`);
    let updatedCount = 0;
    for (const oldNote of structure.allNotes) {
      const newNoteId = mappings.noteIdMap.get(String(oldNote._id));
      if (!newNoteId) {
        console.warn(`  ⚠️ [UPDATE RELATIONSHIPS] No mapping found for note ${oldNote._id}, skipping`);
        continue;
      }

      const newNote = await notesCollection.findOne({ _id: new ObjectId(newNoteId) });
      if (!newNote) {
        console.warn(`  ⚠️ [UPDATE RELATIONSHIPS] Cloned note ${newNoteId} not found, skipping`);
        continue;
      }

      // Update children array with new child IDs
      if (oldNote.children && oldNote.children.length > 0) {
        console.log(`  📄 [UPDATE RELATIONSHIPS] Updating children for note ${newNoteId} (${oldNote.children.length} children)`);
        const newChildren = oldNote.children.map((child) => {
          const newChildId = mappings.noteIdMap.get(child._id);
          return {
            ...child,
            _id: newChildId || child._id,
          };
        });

        await notesCollection.updateOne(
          { _id: new ObjectId(newNoteId) },
          { $set: { children: newChildren } },
        );
        console.log(`  ✅ [UPDATE RELATIONSHIPS] Updated children array for note ${newNoteId}`);
      }

      // Update parent's children array if this is a child
      if (oldNote.parentId) {
        const newParentId = mappings.noteIdMap.get(String(oldNote.parentId));
        if (newParentId) {
          console.log(`  📄 [UPDATE RELATIONSHIPS] Adding note ${newNoteId} to parent ${newParentId}'s children`);
          await notesCollection.updateOne(
            { _id: new ObjectId(newParentId) },
            {
              $push: {
                children: {
                  _id: newNoteId,
                  title: newNote.title,
                  icon: newNote.icon || "",
                  userId: String(newNote.userId),
                  userEmail: newNote.userEmail,
                  isRestrictedPage: newNote.isRestrictedPage || false,
                },
              },
            },
          );
          console.log(`  ✅ [UPDATE RELATIONSHIPS] Added to parent's children array`);
        }
      }
      updatedCount++;
    }
    console.log(`  ✅ [UPDATE RELATIONSHIPS] Updated ${updatedCount} notes`);

    // Rebuild tree structures for root notes
    console.log(`  🔄 [UPDATE RELATIONSHIPS] Rebuilding tree structures for ${structure.rootNotes.length} root notes...`);
    for (const rootNote of structure.rootNotes) {
      const newRootId = mappings.noteIdMap.get(String(rootNote._id));
      if (!newRootId) {
        console.warn(`  ⚠️ [UPDATE RELATIONSHIPS] No mapping for root note ${rootNote._id}, skipping tree rebuild`);
        continue;
      }

      console.log(`  🌳 [UPDATE RELATIONSHIPS] Building tree for root note ${newRootId}`);

      // Build tree recursively
      interface TreeNode {
        _id: string;
        title: string;
        icon: string;
        userId: string;
        userEmail: string;
        children: TreeNode[];
      }

      const buildTree = async (noteId: string): Promise<TreeNode | null> => {
        const note = await notesCollection.findOne({ _id: new ObjectId(noteId) });
        if (!note) return null;

        const children: TreeNode[] = [];
        if (note.children && note.children.length > 0) {
          for (const childRef of note.children) {
            const childTree = await buildTree(childRef._id);
            if (childTree) {
              children.push(childTree);
            }
          }
        }

        return {
          _id: noteId,
          title: note.title,
          icon: note.icon || "",
          userId: String(note.userId),
          userEmail: note.userEmail,
          children,
        };
      };

      const newTree = await buildTree(newRootId);
      if (newTree) {
        await notesCollection.updateOne(
          { _id: new ObjectId(newRootId) },
          { $set: { tree: [newTree] } },
        );
        console.log(`  ✅ [UPDATE RELATIONSHIPS] Tree rebuilt for root note ${newRootId}`);
      } else {
        console.warn(`  ⚠️ [UPDATE RELATIONSHIPS] Could not build tree for root note ${newRootId}`);
      }
    }
    console.log(`✅ [UPDATE RELATIONSHIPS] All relationships updated`);
  },

  /**
   * Resolve target to note visibility settings
   */
  resolveTargetMeta(target: "private" | "public" | "restricted"): {
    isPublicNote: boolean;
    isRestrictedPage: boolean;
  } {
    switch (target) {
      case "public":
        return { isPublicNote: true, isRestrictedPage: false };
      case "restricted":
        return { isPublicNote: true, isRestrictedPage: true };
      case "private":
      default:
        return { isPublicNote: false, isRestrictedPage: false };
    }
  },

  /**
   * Main function to clone a template
   */
  async cloneTemplate({
    templateId,
    userId,
    userEmail,
    userName,
    workspaceId,
    organizationDomain,
    target,
  }: {
    templateId: string;
    userId: string;
    userEmail: string;
    userName: string;
    workspaceId: string;
    organizationDomain: string;
    target: "private" | "public" | "restricted";
  }): Promise<{
    clonedViewId?: string;
    clonedRootNoteIds: string[];
    totalNotesCloned: number;
  }> {
    console.log(`\n🚀 [CLONE TEMPLATE] ==========================================`);
    console.log(`🚀 [CLONE TEMPLATE] Starting template clone process`);
    console.log(`🚀 [CLONE TEMPLATE] Template ID: ${templateId}`);
    console.log(`🚀 [CLONE TEMPLATE] User: ${userEmail} (${userName})`);
    console.log(`🚀 [CLONE TEMPLATE] Target: ${target}`);
    console.log(`🚀 [CLONE TEMPLATE] Workspace: ${workspaceId}`);
    console.log(`🚀 [CLONE TEMPLATE] ==========================================\n`);
    
    // Resolve target to visibility settings
    const targetMeta = TemplateService.resolveTargetMeta(target);
    console.log(`📋 [CLONE TEMPLATE] Target settings: isPublicNote=${targetMeta.isPublicNote}, isRestrictedPage=${targetMeta.isRestrictedPage}`);
    
    // 1. Discover structure
    console.log(`\n📋 [CLONE TEMPLATE] Step 1: Discovering template structure...`);
    const structure = await TemplateService.discoverTemplateStructure(templateId);
    console.log(`✅ [CLONE TEMPLATE] Structure discovered: ${structure.allNotes.length} notes, ${structure.view ? 'has view' : 'no view'}`);

    // 2. Discover all viewIds in content
    console.log(`\n📋 [CLONE TEMPLATE] Step 2: Discovering viewIds in content...`);
    const allViewIds = new Set<string>();
    const STORAGE_SYSTEM = process.env.STORAGE_SYSTEM;
    console.log(`📦 [CLONE TEMPLATE] Storage system: ${STORAGE_SYSTEM}`);
    
    for (const note of structure.allNotes) {
      try {
        let content: string = "";
        
        if (STORAGE_SYSTEM === "github") {
          // Get content from GitHub
          console.log(`  📄 [CLONE TEMPLATE] Getting content from GitHub for note ${note._id}`);
          const fileContent = await getFileContent(note.contentPath);
          content = fileContent.content;
        } else if (STORAGE_SYSTEM === "mongodb") {
          // Get content from MongoDB cluster
          if (note.clusterName) {
            console.log(`  📄 [CLONE TEMPLATE] Getting content from MongoDB cluster ${note.clusterName} for note ${note._id}`);
            const { clusterManager } = await import("@/lib/mongoDb/clusterManager");
            const contentClient = await clusterManager.getContentClient(note.clusterName);
            const contentDb = contentClient.db();
            const contentCollection = contentDb.collection("note_content");

            const contentDoc = await contentCollection.findOne({
              noteId: String(note._id),
            });

            if (contentDoc && contentDoc.content) {
              content =
                typeof contentDoc.content === "string"
                  ? contentDoc.content
                  : JSON.stringify(contentDoc.content);
              console.log(`  ✅ [CLONE TEMPLATE] Content found for note ${note._id}`);
            } else {
              console.log(`  ⚠️ [CLONE TEMPLATE] No content found for note ${note._id}`);
            }
          } else {
            // Fallback: try to get via adapterForGetNote
            console.log(`  📄 [CLONE TEMPLATE] No clusterName, using adapterForGetNote for note ${note._id}`);
            const noteWithContent = await adapterForGetNote({ id: String(note._id), includeContent: true });
            content = noteWithContent.content || "";
          }
        }

        if (content) {
          const contentObj = typeof content === "string" ? JSON.parse(content) : content;
          const beforeCount = allViewIds.size;
          TemplateService.discoverViewIdsInContent(contentObj, allViewIds);
          const afterCount = allViewIds.size;
          if (afterCount > beforeCount) {
            console.log(`  🔍 [CLONE TEMPLATE] Found ${afterCount - beforeCount} new viewId(s) in note ${note._id}`);
          }
        }
      } catch (error) {
        // Content might not exist, that's okay
        console.warn(`  ⚠️ [CLONE TEMPLATE] Could not read content for note ${note._id} to discover viewIds:`, error);
      }
    }
    console.log(`✅ [CLONE TEMPLATE] Total viewIds found in content: ${allViewIds.size}`);
    if (allViewIds.size > 0) {
      console.log(`  📋 [CLONE TEMPLATE] ViewIds: ${Array.from(allViewIds).join(", ")}`);
    }

    // 3. Ensure we have ALL notes in the database view (if it exists)
    // Also check views found in content - they might be the main database view
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");
    const viewCollection = db.collection<IVeiwDatabase>("viewDatabases");
    
    // If no main view was found via databaseViewId, check if any view in content should be the main view
    if (!structure.view && allViewIds.size > 0) {
      console.log(`  🔍 [CLONE TEMPLATE] No main database view found, checking views in content...`);
      // Get the first view found in content (or check all of them)
      for (const viewId of allViewIds) {
        const view = await viewCollection.findOne({ _id: new ObjectId(viewId) });
        if (view) {
          console.log(`  ✅ [CLONE TEMPLATE] Found view in content: ${view.title} (${viewId})`);
          structure.view = view;
          // Get database source ID from view (notes are linked to database source, not view)
          let databaseSourceId: ObjectId | null = null;
          if (view.viewsType && view.viewsType.length > 0) {
            const sourceId = view.viewsType[0]?.databaseSourceId;
            databaseSourceId = sourceId || null;
            console.log(`  📦 [CLONE TEMPLATE] Database source ID: ${databaseSourceId}`);
          }

          // Get all notes in this database source (not view)
          let viewNotes: INote[] = [];
          if (databaseSourceId) {
            viewNotes = await notesCollection
              .find({ databaseViewId: databaseSourceId })
              .toArray();
          } else {
            // Fallback: try with view ID (for backward compatibility)
            console.log(`  ⚠️ [CLONE TEMPLATE] No database source ID, using view ID as fallback`);
            viewNotes = await notesCollection
              .find({ databaseViewId: view._id })
              .toArray();
          }
          console.log(`  📋 [CLONE TEMPLATE] Found ${viewNotes.length} notes in this database source`);
          
          // Add notes to structure
          for (const note of viewNotes) {
            const noteIdStr = String(note._id);
            if (!structure.allNotes.find((n) => String(n._id) === noteIdStr)) {
              structure.allNotes.push(note);
              console.log(`  ➕ [CLONE TEMPLATE] Added note ${noteIdStr} to structure.allNotes`);
            }
          }
          
          // Update rootNotes to include all database notes
          structure.rootNotes = viewNotes;
          console.log(`  ✅ [CLONE TEMPLATE] Set as main database view with ${viewNotes.length} notes`);
          
          // Get all descendants for each root note
          for (const rootNote of viewNotes) {
            const descendants = await getAllDescendantNoteIds(new ObjectId(rootNote._id!));
            for (const descId of descendants) {
              const descNote = await notesCollection.findOne({ _id: descId });
              if (descNote && !structure.allNotes.find((n) => String(n._id) === String(descId))) {
                structure.allNotes.push(descNote);
              }
            }
          }
          break; // Use the first view found as the main view
        }
      }
    }
    
    if (structure.view) {
      // Get database source ID from view (notes are linked to database source, not view)
      let databaseSourceId: ObjectId | null = null;
      if (structure.view.viewsType && structure.view.viewsType.length > 0) {
        const sourceId = structure.view.viewsType[0]?.databaseSourceId;
        databaseSourceId = sourceId || null;
        console.log(`  📦 [CLONE TEMPLATE] Database source ID: ${databaseSourceId}`);
      }

      // Get ALL notes with this databaseSourceId (not viewId)
      let allViewNotes: INote[] = [];
      if (databaseSourceId) {
        console.log(`  🔍 [CLONE TEMPLATE] Getting all notes with databaseSourceId: ${databaseSourceId}`);
        allViewNotes = await notesCollection
          .find({ databaseViewId: databaseSourceId })
          .toArray();
      } else {
        // Fallback: try with view ID (for backward compatibility)
        console.log(`  ⚠️ [CLONE TEMPLATE] No database source ID, using view ID as fallback`);
        allViewNotes = await notesCollection
          .find({ databaseViewId: structure.view._id })
          .toArray();
      }
      
      // Add any missing notes to structure.allNotes
      for (const note of allViewNotes) {
        const noteIdStr = String(note._id);
        if (!structure.allNotes.find((n) => String(n._id) === noteIdStr)) {
          structure.allNotes.push(note);
          console.log(`  ➕ [CLONE TEMPLATE] Added missing note ${noteIdStr} to structure.allNotes`);
        }
      }
      
      // Update rootNotes to include all database notes
      structure.rootNotes = allViewNotes;
      console.log(`  ✅ [CLONE TEMPLATE] Total notes in database source: ${allViewNotes.length}`);
      
      // Get all descendants for each root note
      for (const rootNote of allViewNotes) {
        const descendants = await getAllDescendantNoteIds(new ObjectId(rootNote._id!));
        for (const descId of descendants) {
          const descNote = await notesCollection.findOne({ _id: descId });
          if (descNote && !structure.allNotes.find((n) => String(n._id) === String(descId))) {
            structure.allNotes.push(descNote);
          }
        }
      }
    }

    // 4. Create ID mappings (including views found in content)
    const mappings = TemplateService.createIdMappings(structure);
    
    // Add mappings for views found in content (but not the main database view)
    console.log(`  🔍 [CLONE TEMPLATE] Adding mappings for inline views found in content...`);
    for (const viewId of allViewIds) {
      // Skip if this is the main database view (already mapped)
      if (structure.view && String(structure.view._id) === viewId) {
        console.log(`    ⏭️ [CLONE TEMPLATE] Skipping main database view ${viewId} (already mapped)`);
        continue;
      }
      
      // Add mapping for inline view
      if (!mappings.viewIdMap.has(viewId)) {
        const newViewId = new ObjectId().toString();
        mappings.viewIdMap.set(viewId, newViewId);
        console.log(`    ➕ [CLONE TEMPLATE] Added inline view mapping: ${viewId} → ${newViewId}`);
      }
    }

    // 5. Clone database view if exists
    console.log(`\n📋 [CLONE TEMPLATE] Step 5: Cloning database view...`);
    let newDatabaseViewId: string | undefined;
    if (structure.view) {
      newDatabaseViewId = await TemplateService.cloneDatabaseView(
        structure.view,
        mappings,
        userId,
        userEmail,
        userName,
        workspaceId,
        organizationDomain,
      );
      console.log(`✅ [CLONE TEMPLATE] Database view cloned: ${newDatabaseViewId}`);
    } else {
      console.log(`ℹ️ [CLONE TEMPLATE] No database view to clone`);
    }

    // 6. Clone all inline views found in content
    console.log(`\n📋 [CLONE TEMPLATE] Step 6: Cloning inline views found in content...`);
    let inlineViewCount = 0;
    for (const viewId of allViewIds) {
      // Skip if this is the main database view (already cloned)
      if (structure.view && String(structure.view._id) === viewId) {
        continue;
      }
      
      // Clone this inline view
      console.log(`  🔄 [CLONE TEMPLATE] Cloning inline view: ${viewId}`);
      const oldView = await viewCollection.findOne({ _id: new ObjectId(viewId) });
      if (oldView) {
        await TemplateService.cloneDatabaseView(
          oldView,
          mappings,
          userId,
          userEmail,
          userName,
          workspaceId,
          organizationDomain,
        );
        inlineViewCount++;
        console.log(`  ✅ [CLONE TEMPLATE] Inline view cloned: ${viewId}`);
      } else {
        console.warn(`  ⚠️ [CLONE TEMPLATE] Inline view ${viewId} not found in database`);
      }
    }
    console.log(`✅ [CLONE TEMPLATE] Cloned ${inlineViewCount} inline views`);

    // 7. Clone all notes recursively
    const clonedRootNoteIds: string[] = [];
    
    // If we have a database view, clone ALL notes in that view (not just root notes)
    if (structure.view && newDatabaseViewId) {
      // Get the new database source ID from mappings
      const oldDatabaseSourceId = structure.view.viewsType?.[0]?.databaseSourceId;
      if (!oldDatabaseSourceId) {
        throw new Error("Database source ID not found in view");
      }

      const newDatabaseSourceId = mappings.databaseSourceIdMap.get(String(oldDatabaseSourceId));
      if (!newDatabaseSourceId) {
        throw new Error("New database source ID mapping not found");
      }

      console.log(`  📦 [CLONE TEMPLATE] New database source ID: ${newDatabaseSourceId}`);
      
      // Get ALL notes that belong to the OLD database source (for cloning)
      const oldDatabaseSourceObjectId = oldDatabaseSourceId instanceof ObjectId 
        ? oldDatabaseSourceId 
        : new ObjectId(String(oldDatabaseSourceId));
      
      const allDatabaseNotes = await notesCollection
        .find({ databaseViewId: oldDatabaseSourceObjectId })
        .toArray();
      
      console.log(`  📋 [CLONE TEMPLATE] Found ${allDatabaseNotes.length} notes in old database source ${String(oldDatabaseSourceId)}`);
      
      // Ensure all database notes are in the mappings (they should be from discovery, but double-check)
      for (const dbNote of allDatabaseNotes) {
        const noteIdStr = String(dbNote._id);
        if (!mappings.noteIdMap.has(noteIdStr)) {
          const newId = new ObjectId().toString();
          mappings.noteIdMap.set(noteIdStr, newId);
          console.log(`  ➕ [CLONE TEMPLATE] Added database note ${noteIdStr} to mappings: ${newId}`);
        }
      }
      
      // First, check if we need to clone the template note itself (the note that owns the database view)
      // The view's noteId points to the template note
      console.log(`  🔍 [CLONE TEMPLATE] Checking if template note needs to be cloned...`);
      const templateNoteId = String(structure.view.noteId || "");
      let newTemplateNoteId: string | undefined;
      
      if (templateNoteId && templateNoteId !== "null" && templateNoteId !== "undefined" && mappings.noteIdMap.has(templateNoteId)) {
        // Template note is already in mappings (we added it in discovery)
        newTemplateNoteId = mappings.noteIdMap.get(templateNoteId);
        console.log(`  ✅ [CLONE TEMPLATE] Template note ${templateNoteId} already in mappings → ${newTemplateNoteId}`);
      } else if (templateNoteId && templateNoteId !== "null" && templateNoteId !== "undefined") {
        // Template note not in mappings, add it
        newTemplateNoteId = new ObjectId().toString();
        mappings.noteIdMap.set(templateNoteId, newTemplateNoteId);
        console.log(`  ➕ [CLONE TEMPLATE] Added template note ${templateNoteId} to mappings with new ID ${newTemplateNoteId}`);
      }
      
      // Clone the template note if it exists and is not already a database note
      if (newTemplateNoteId && templateNoteId && templateNoteId !== "null" && templateNoteId !== "undefined") {
        // Get the template note (the note that owns the database view)
        console.log(`  🔄 [CLONE TEMPLATE] Cloning template note: ${templateNoteId} → ${newTemplateNoteId}`);
        const templateNote = await notesCollection.findOne({ _id: new ObjectId(templateNoteId) });
        if (templateNote && !allDatabaseNotes.find((n) => String(n._id) === templateNoteId)) {
          // Template note is not in the database notes, clone it separately
          await TemplateService.cloneNoteRecursive(
            templateNote,
            null, // Template note has no parent
            newTemplateNoteId,
            mappings,
            userId,
            userEmail,
            userName,
            workspaceId,
            organizationDomain,
            newDatabaseSourceId, // Associate with new database source (not view)
            targetMeta.isPublicNote,
            targetMeta.isRestrictedPage,
          );
          clonedRootNoteIds.push(newTemplateNoteId);
          console.log(`  ✅ [CLONE TEMPLATE] Template note cloned: ${templateNoteId} → ${newTemplateNoteId}`);
        } else {
          console.log(`  ℹ️ [CLONE TEMPLATE] Template note is already a database note, skipping separate clone`);
        }
      }
      
      // Clone each note in the database view using adapterForCreateNote (via cloneNoteRecursive)
      console.log(`  🔄 [CLONE TEMPLATE] Cloning ${allDatabaseNotes.length} database notes...`);
      for (let i = 0; i < allDatabaseNotes.length; i++) {
        const databaseNote = allDatabaseNotes[i];
        if (!databaseNote) {
          console.warn(`  ⚠️ [CLONE TEMPLATE] Database note at index ${i} is undefined, skipping`);
          continue;
        }
        
        console.log(`\n  📄 [CLONE TEMPLATE] Cloning database note ${i + 1}/${allDatabaseNotes.length}: ${databaseNote.title}`);
        
        const oldNoteIdStr = String(databaseNote._id);
        let newNoteId = mappings.noteIdMap.get(oldNoteIdStr);
        
        if (!newNoteId) {
          // If note not in mapping, add it (shouldn't happen, but handle gracefully)
          newNoteId = new ObjectId().toString();
          mappings.noteIdMap.set(oldNoteIdStr, newNoteId);
          console.log(`    ➕ [CLONE TEMPLATE] Added missing note ${oldNoteIdStr} to mappings with new ID ${newNoteId}`);
        }

        // Database notes are created at the top level (no parent)
        const newRootParentId = newNoteId;

        // Clone the note recursively (this uses adapterForCreateNote internally)
        await TemplateService.cloneNoteRecursive(
          databaseNote,
          null, // Database notes have no parent
          newRootParentId,
          mappings,
          userId,
          userEmail,
          userName,
          workspaceId,
          organizationDomain,
          newDatabaseSourceId, // Associate with new database source (not view)
          targetMeta.isPublicNote,
          targetMeta.isRestrictedPage,
        );

        clonedRootNoteIds.push(newNoteId);
        console.log(`  ✅ [CLONE TEMPLATE] Database note ${i + 1}/${allDatabaseNotes.length} cloned: ${newNoteId}`);
      }
      
      // Update the view's noteId to point to the new template note (or first cloned note if template note wasn't cloned)
      console.log(`\n  📋 [CLONE TEMPLATE] Updating view's noteId...`);
      if (newTemplateNoteId) {
        await viewCollection.updateOne(
          { _id: new ObjectId(newDatabaseViewId) },
          { $set: { noteId: newTemplateNoteId } },
        );
        console.log(`  ✅ [CLONE TEMPLATE] Updated view ${newDatabaseViewId} noteId to ${newTemplateNoteId}`);
      } else if (clonedRootNoteIds.length > 0) {
        // Fallback: use first cloned note as owner
        await viewCollection.updateOne(
          { _id: new ObjectId(newDatabaseViewId) },
          { $set: { noteId: clonedRootNoteIds[0] } },
        );
        console.log(`  ✅ [CLONE TEMPLATE] Updated view ${newDatabaseViewId} noteId to first cloned note ${clonedRootNoteIds[0]}`);
      }
    } else {
      // If no database view, clone root notes normally
      for (const rootNote of structure.rootNotes) {
        const newRootId = mappings.noteIdMap.get(String(rootNote._id));
        if (!newRootId) continue;

        // Root notes are created at the top level (no parent)
        const newRootParentId = newRootId;

        await TemplateService.cloneNoteRecursive(
          rootNote,
          null, // Root notes have no parent
          newRootParentId,
          mappings,
          userId,
          userEmail,
          userName,
          workspaceId,
          organizationDomain,
          undefined, // No database source for regular root notes
          targetMeta.isPublicNote,
          targetMeta.isRestrictedPage,
        );

        clonedRootNoteIds.push(newRootId);
      }
    }

    // 8. Update all relationships
    console.log(`\n📋 [CLONE TEMPLATE] Step 8: Updating relationships...`);
    await TemplateService.updateRelationships(mappings, structure);
    console.log(`✅ [CLONE TEMPLATE] Relationships updated`);

    console.log(`\n🎉 [CLONE TEMPLATE] ==========================================`);
    console.log(`🎉 [CLONE TEMPLATE] Template clone completed successfully!`);
    console.log(`🎉 [CLONE TEMPLATE] Cloned view ID: ${newDatabaseViewId || "none"}`);
    console.log(`🎉 [CLONE TEMPLATE] Cloned root note IDs: ${clonedRootNoteIds.length} notes`);
    console.log(`🎉 [CLONE TEMPLATE] Total notes cloned: ${structure.allNotes.length}`);
    console.log(`🎉 [CLONE TEMPLATE] ==========================================\n`);

    return {
      clonedViewId: newDatabaseViewId,
      clonedRootNoteIds,
      totalNotesCloned: structure.allNotes.length,
    };
  },

  /**
   * Get available templates
   */
  async getAvailableTemplates({
    userId,
    workspaceId,
    organizationDomain,
  }: {
    userId: string;
    workspaceId?: string;
    organizationDomain?: string;
  }): Promise<INote[]> {
    const client = await clientPromise();
    const db = client.db();
    const notesCollection = db.collection<INote>("notes");

    const query: any = { isTemplate: true };

    // If workspace specified, get workspace templates
    if (workspaceId) {
      query.workspaceId = workspaceId;
    } else if (organizationDomain) {
      // Get organization templates
      query.organizationDomain = organizationDomain;
    } else {
      // Get global templates (no workspace/organization restriction)
      query.$or = [
        { workspaceId: { $exists: false } },
        { workspaceId: "" },
      ];
    }

    const templates = await notesCollection.find(query).sort({ createdAt: -1 }).toArray();

    return templates;
  },
};


