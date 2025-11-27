import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import type { AnyBulkWriteOperation } from "mongodb";
import type { ViewTypeWithIconAndTitle } from "@/models/types/VeiwDatabase";
import {
  IVeiwDatabase,
  IDatabaseSource,
  PropertyType,
  PropertyOption,
  PropertySchema,
  ViewType,
  GitHubPrConfig,
} from "@/models/types/VeiwDatabase";
import { INote } from "@/models/types/Note";
import { IViewType } from "@/models/types/ViewTypes";
import { AuditService } from "./auditService";
import { sendEmail } from "@/lib/emailNotification/sendEmailNotification";
import { getNoteAssignationHtml } from "@/lib/emailNotification/emailTemplate/noteAssignationTemplate";
import { INotification } from "@/models/types/Notification";
import { IUser } from "@/models/types/User";
import { UserService } from "./userService";
import { createFormulaRuntime } from "@/lib/formula/evaluator";
import { GitHubIntegrationService } from "./githubIntegrationService";

export async function checkDefault(
  viewId: string,
  type: PropertyType,
  source?: IDatabaseSource,
): Promise<boolean> {
  const client = await clientPromise();
  const db = client.db();

    // Get source if not passed
    let databaseSource: IDatabaseSource | null = source || null;
    if (!databaseSource) {
      const viewCollection = db.collection<IVeiwDatabase>("viewDatabases");
      const view = await viewCollection.findOne({ _id: new ObjectId(viewId) });
      if (!view || !view.viewsType || view.viewsType.length === 0) {
        return false;
      }
      const databaseSourceId = view.viewsType[0]?.databaseSourceId;
      if (!databaseSourceId) {
        return false;
      }
      const sourcesCollection = db.collection<IDatabaseSource>("databaseSources");
      databaseSource = await sourcesCollection.findOne({ _id: databaseSourceId });
    }
    
    if (!databaseSource) return false;

  // get all properties from source
  const properties = Object.values(databaseSource.properties || {});

  // count how many of this type exist
  const sameTypeProps = properties.filter((p) => p.type === type);

  // first occurrence if only 1 exists
  return sameTypeProps.length < 1;
}

// Helper function to get database source from view
async function getDatabaseSourceFromView(viewId: string): Promise<IDatabaseSource | null> {
  const client = await clientPromise();
  const db = client.db();
  const viewCollections = db.collection<IVeiwDatabase>("viewDatabases");
  const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");
  
  const view = await viewCollections.findOne({ _id: new ObjectId(viewId) });
  if (!view || !view.viewsType || view.viewsType.length === 0) {
    return null;
  }
  
  // Get databaseSourceId from first view type (all should have same source)
  const databaseSourceId = view.viewsType[0]?.databaseSourceId;
  if (!databaseSourceId) {
    return null;
  }
  
  const source = await databaseSourcesCollection.findOne({ _id: databaseSourceId });
  return source;
}

function buildFormulaRuntime(source: IDatabaseSource) {
  const propertyDefinitions: Record<string, { id: string; name: string; type: string; options?: PropertyOption[] }> =
    {};

  const sourceProperties = source.properties || {};
  Object.entries(sourceProperties).forEach(([id, property]) => {
    if (property) {
      propertyDefinitions[id] = {
        id,
        name: property.name,
        type: property.type,
        options: property.options,
      };
    }
  });

  return createFormulaRuntime(propertyDefinitions);
}

type GitHubPrValueInput = {
  owner?: string;
  repo?: string;
  pullNumber?: number | string;
  number?: number | string;
  installationId?: number;
};

type GitHubPrPreparedValue = {
  persistedValue: Record<string, any>;
  statusUpdate?: { propertyId: string; value: string };
};

function resolveUserIdForGithub(currentUser: IUser): string {
  if (currentUser.id) {
    return currentUser.id;
  }
  if (typeof currentUser._id === "string") {
    return currentUser._id;
  }
  if (currentUser._id) {
    return currentUser._id.toString();
  }
  throw new Error("Current user identifier is required for GitHub PR sync.");
}

function normalizeGithubPrValue(
  rawValue: unknown,
  config?: GitHubPrConfig,
): { owner: string; repo: string; pullNumber: number; installationId?: number } {
  if (!rawValue || typeof rawValue !== "object") {
    throw new Error("GitHub PR property value must be an object.");
  }
  const value = rawValue as GitHubPrValueInput;

  const owner = (value.owner ?? config?.defaultOwner)?.trim();
  const repo = (value.repo ?? config?.defaultRepo)?.trim();
  const pullNumberSource = value.pullNumber ?? value.number;
  const pullNumber = Number(pullNumberSource);

  if (!owner || !repo || pullNumberSource === undefined || Number.isNaN(pullNumber)) {
    throw new Error("GitHub PR value must include owner, repo, and pullNumber.");
  }

  return {
    owner,
    repo,
    pullNumber,
    installationId: value.installationId ?? config?.installationId,
  };
}

function pickStatusOptionName(
  options: PropertyOption[] | undefined,
  preferredId?: string,
  fallbackNames: string[] = [],
): string | undefined {
  if (!options || options.length === 0) {
    return undefined;
  }
  if (preferredId) {
    const match = options.find((opt) => opt.id === preferredId);
    if (match) {
      return match.name;
    }
  }
  if (fallbackNames.length > 0) {
    const lowerFallbacks = fallbackNames.map((n) => n.toLowerCase());
    const fallback = options.find((opt) => lowerFallbacks.includes(opt.name.toLowerCase()));
    if (fallback) {
      return fallback.name;
    }
  }
  return undefined;
}

function computeStatusUpdateForGithubPr(
  config: GitHubPrConfig | undefined,
  sourceProperties: Record<string, PropertySchema>,
  prState: { merged: boolean; state: "open" | "closed" },
): { propertyId: string; value: string } | undefined {
  // If no statusPropertyId is configured, try to find a default status property
  let statusPropertyId = config?.statusPropertyId;
  if (!statusPropertyId) {
    // Look for a property named "Status" (case-insensitive) or the first status property
    const statusProp = Object.entries(sourceProperties).find(
      ([_, prop]) => prop.type === "status" && prop.name.toLowerCase() === "status",
    );
    if (statusProp) {
      statusPropertyId = statusProp[0];
      console.log(
        `[GitHub PR Sync] Auto-detected status property: ${statusPropertyId} (${statusProp[1].name})`,
      );
    } else {
      // Fallback to any status property
      const anyStatusProp = Object.entries(sourceProperties).find(
        ([_, prop]) => prop.type === "status",
      );
      if (anyStatusProp) {
        statusPropertyId = anyStatusProp[0];
        console.log(
          `[GitHub PR Sync] Auto-detected first status property: ${statusPropertyId} (${anyStatusProp[1].name})`,
        );
      }
    }
  }

  if (!statusPropertyId) {
    console.log(
      "[GitHub PR Sync] No status property found in database. Please add a status property or configure statusPropertyId in GitHub PR settings.",
    );
    return undefined;
  }

  const targetProperty = sourceProperties[statusPropertyId];
  if (!targetProperty || targetProperty.type !== "status") {
    console.warn(
      `[GitHub PR Sync] Status property '${statusPropertyId}' is missing or not a status type. Found: ${targetProperty?.type || "missing"}`,
    );
    return undefined;
  }

  const options = targetProperty.options || [];
  console.log(
    `[GitHub PR Sync] Computing status update. PR state: ${prState.state}, merged: ${prState.merged}. Available options:`,
    options.map((o) => o.name),
  );

  const pendingName = pickStatusOptionName(
    options,
    config?.pendingStatusOptionId,
    ["pending", "todo", "in progress", "open"],
  );
  const completedName = pickStatusOptionName(
    options,
    config?.completedStatusOptionId,
    ["completed", "complete", "done", "merged", "closed"],
  );

  console.log(
    `[GitHub PR Sync] Resolved options - pending: "${pendingName}", completed: "${completedName}"`,
  );

  const isCompleteState = prState.merged || prState.state === "closed";
  const desiredName = isCompleteState ? completedName ?? pendingName : pendingName ?? completedName;

  if (!desiredName) {
    console.warn(
      `[GitHub PR Sync] Unable to resolve a status option for GitHub PR sync. PR state: ${prState.state}, merged: ${prState.merged}, pendingName: ${pendingName}, completedName: ${completedName}`,
    );
    return undefined;
  }

  console.log(
    `[GitHub PR Sync] Status update computed: propertyId=${statusPropertyId}, value="${desiredName}", PR state=${prState.state}, merged=${prState.merged}, isCompleteState=${isCompleteState}`,
  );

  return {
    propertyId: statusPropertyId,
    value: desiredName,
  };
}

async function prepareGithubPrValue({
  rawValue,
  config,
  currentUserId,
  sourceProperties,
}: {
  rawValue: unknown;
  config?: GitHubPrConfig;
  currentUserId: string;
  sourceProperties: Record<string, PropertySchema>;
}): Promise<GitHubPrPreparedValue> {
  const normalized = normalizeGithubPrValue(rawValue, config);
  console.log(
    `[GitHub PR] Preparing PR value. Normalized:`,
    JSON.stringify(normalized, null, 2),
    `Config:`,
    JSON.stringify(config, null, 2),
  );

  let prStatus;
  try {
    prStatus = await GitHubIntegrationService.getPullRequestStatus({
      userId: currentUserId,
      owner: normalized.owner,
      repo: normalized.repo,
      pullNumber: normalized.pullNumber,
      installationId: normalized.installationId ?? config?.installationId,
    });
    console.log(`[GitHub PR] Fetched PR status:`, {
      number: prStatus.number,
      state: prStatus.state,
      merged: prStatus.merged,
      title: prStatus.title,
    });
  } catch (error) {
    console.error(`[GitHub PR] Failed to fetch PR status:`, error);
    throw error;
  }

  const persistedValue = {
    owner: normalized.owner,
    repo: normalized.repo,
    pullNumber: normalized.pullNumber,
    installationId: normalized.installationId,
    number: prStatus.number,
    title: prStatus.title,
    url: prStatus.htmlUrl,
    state: prStatus.state,
    merged: prStatus.merged,
    draft: prStatus.draft,
    headSha: prStatus.headSha,
    baseSha: prStatus.baseSha,
    lastSyncedAt: new Date().toISOString(),
    prUpdatedAt: prStatus.updatedAt,
  };

  const statusUpdate = computeStatusUpdateForGithubPr(config, sourceProperties, {
    merged: prStatus.merged,
    state: prStatus.state,
  });

  console.log(`[GitHub PR] Prepared value. Status update:`, statusUpdate);

  return { persistedValue, statusUpdate };
}
export const DatabaseService = {
  async getDataSourceById({ dataSourceId }: { dataSourceId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const dataSourceCollection = db.collection<IDatabaseSource>("databaseSources");
    const dataSource = await dataSourceCollection.findOne({ _id: new ObjectId(dataSourceId) });
    if(!dataSource){
      throw new Error("Data source not found");
    }
    const notes = await db.collection<INote>("notes").find({ databaseViewId: new ObjectId(dataSourceId) }).toArray();
    
    return { dataSource, notes };
  },

  async getAllDataSourcesByWorkspace({ workspaceId }: { workspaceId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const dataSourceCollection = db.collection<IDatabaseSource>("databaseSources");
    
    if (!workspaceId) {
      throw new Error("Workspace ID is required");
    }

    const dataSources = await dataSourceCollection
      .find({ workspaceId: workspaceId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();
    
    return dataSources;
  },
  async updateViewType({
    viewId,
    viewTypeId,
    icon,
    title,
    newViewType,
    formIcon,
    formCoverImage,
    formTitle,
    formDescription,
    isPublicForm,
    formAnonymousResponses,
    formAccessToSubmission,
  }: {
    viewId: string;
    viewTypeId: string;
    icon: string;
    title: string;
    newViewType?: string;
    formIcon?: string;
    formCoverImage?: string;
    formTitle?: string;
    formDescription?: string;
    isPublicForm?: boolean;
    formAnonymousResponses?: boolean;
    formAccessToSubmission?: "no_access" | "can_view_own";
  }) {
    const client = await clientPromise();
    const db = client.db();
    const viewCollection = db.collection<IVeiwDatabase>("viewDatabases");
    const viewTypesCollection = db.collection<IViewType>("viewTypes");
    
    const view = await viewCollection.findOne({ _id: new ObjectId(viewId) });
    if(!view){
      throw new Error("View not found");
    }
  
    const viewTypes = view.viewsType;
    if(!viewTypes){
      throw new Error("View types not found");
    }
    const viewTypeObjectId = new ObjectId(viewTypeId);
    const existingViewType = viewTypes.find(vt => {
      if (!vt._id) return false;
      const vtId = typeof vt._id === "string" ? new ObjectId(vt._id) : vt._id;
      return vtId.equals(viewTypeObjectId);
    });
    if(existingViewType){
      const existingIndex = viewTypes.findIndex(vt => {
        if (!vt._id) return false;
        const vtId = typeof vt._id === "string" ? new ObjectId(vt._id) : vt._id;
        return vtId.equals(viewTypeObjectId);
      });
      // Use newViewType if provided, otherwise keep existing viewType
      const finalViewType: IViewType["viewType"] = (newViewType as IViewType["viewType"]) || existingViewType.viewType;
      if (!existingViewType._id) {
        throw new Error("View type must have an _id");
      }
      viewTypes[existingIndex] = { 
        _id: existingViewType._id, 
        viewType: finalViewType, 
        icon, 
        title,
        databaseSourceId: existingViewType.databaseSourceId,
        formIcon: formIcon !== undefined ? formIcon : existingViewType.formIcon,
        formCoverImage: formCoverImage !== undefined ? formCoverImage : existingViewType.formCoverImage,
        formTitle: formTitle !== undefined ? formTitle : existingViewType.formTitle,
        formDescription: formDescription !== undefined ? formDescription : existingViewType.formDescription,
        isPublicForm: isPublicForm !== undefined ? isPublicForm : (existingViewType as any).isPublicForm,
        formAnonymousResponses: formAnonymousResponses !== undefined ? formAnonymousResponses : (existingViewType as any).formAnonymousResponses,
        formAccessToSubmission: formAccessToSubmission !== undefined ? formAccessToSubmission : (existingViewType as any).formAccessToSubmission,
      } as ViewTypeWithIconAndTitle;
      
      // Update in viewTypes collection
      const updateData: any = { 
        icon, 
        title,
        databaseSourceId: existingViewType.databaseSourceId
      };
      if (newViewType) {
        updateData.viewType = newViewType;
      }
      if (formIcon !== undefined) {
        updateData.formIcon = formIcon;
      }
      if (formCoverImage !== undefined) {
        updateData.formCoverImage = formCoverImage;
      }
      if (formTitle !== undefined) {
        updateData.formTitle = formTitle;
      }
      if (formDescription !== undefined) {
        updateData.formDescription = formDescription;
      }
      if (isPublicForm !== undefined) {
        updateData.isPublicForm = isPublicForm;
      }
      if (formAnonymousResponses !== undefined) {
        updateData.formAnonymousResponses = formAnonymousResponses;
      }
      if (formAccessToSubmission !== undefined) {
        updateData.formAccessToSubmission = formAccessToSubmission;
      }
      await viewTypesCollection.updateOne(
        { _id: viewTypeObjectId },
        { 
          $set: updateData
        }
      );
    } else {
      throw new Error("View type not found");
    }

    const update = await viewCollection.updateOne(
      { _id: new ObjectId(viewId) },
      { $set: { viewsType: viewTypes } }
    );
    if(!update){
      throw new Error("Failed to update view type");
    }
    return { success: true, view: view };
  },

  async updateViewDataSource({ viewId, viewTypeId, dataSourceId }: { viewId: string; viewTypeId: string; dataSourceId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const viewCollection = db.collection<IVeiwDatabase>("viewDatabases");
    const viewTypesCollection = db.collection<IViewType>("viewTypes");
    
    const view = await viewCollection.findOne({ _id: new ObjectId(viewId) });
    if (!view) {
      throw new Error("View not found");
    }

    const viewTypes = view.viewsType;
    if (!viewTypes) {
      throw new Error("View types not found");
    }

    const viewTypeObjectId = new ObjectId(viewTypeId);
    const existingViewType = viewTypes.find(vt => {
      if (!vt._id) return false;
      const vtId = typeof vt._id === "string" ? new ObjectId(vt._id) : vt._id;
      return vtId.equals(viewTypeObjectId);
    });

    if (!existingViewType) {
      throw new Error("View type not found");
    }

    const existingIndex = viewTypes.findIndex(vt => {
      if (!vt._id) return false;
      const vtId = typeof vt._id === "string" ? new ObjectId(vt._id) : vt._id;
      return vtId.equals(viewTypeObjectId);
    });

    const newDataSourceId = new ObjectId(dataSourceId);
    
    // Update the view type with new data source ID
    viewTypes[existingIndex] = {
      ...existingViewType,
      databaseSourceId: newDataSourceId
    };

    // Update in viewTypes collection
    await viewTypesCollection.updateOne(
      { _id: viewTypeObjectId },
      {
        $set: {
          databaseSourceId: newDataSourceId
        }
      }
    );

    // Update in viewDatabases collection
    const update = await viewCollection.updateOne(
      { _id: new ObjectId(viewId) },
      { $set: { viewsType: viewTypes } }
    );

    if (!update) {
      throw new Error("Failed to update view data source");
    }

    // Return updated view
    const updatedView = await viewCollection.findOne({ _id: new ObjectId(viewId) });
    return { success: true, view: updatedView };
  },

  async deleteViewType({ viewId, viewTypeId }: { viewId: string; viewTypeId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const viewCollection = db.collection<IVeiwDatabase>("viewDatabases");
    const viewTypesCollection = db.collection<IViewType>("viewTypes");
    
    const view = await viewCollection.findOne({ _id: new ObjectId(viewId) });
    if(!view){
      throw new Error("View not found");
    }
    const viewTypes = view.viewsType;
    if(!viewTypes){
      throw new Error("View types not found");
    }
    const viewTypeObjectId = new ObjectId(viewTypeId);
    const viewTypeToDelete = viewTypes.find(vt => {
      if (!vt._id) return false;
      const vtId = typeof vt._id === "string" ? new ObjectId(vt._id) : vt._id;
      return vtId.equals(viewTypeObjectId);
    });
    
    if(!viewTypeToDelete){
      throw new Error("View type not found");
    }
    
    // Delete from viewTypes collection
    await viewTypesCollection.deleteOne({ _id: viewTypeObjectId });
    
    // Delete from view's viewsType array
    const update = await viewCollection.findOneAndUpdate(
      { _id: new ObjectId(viewId) },
      { $pull: { viewsType: { _id: viewTypeObjectId } } },
      { returnDocument: "after" }
    );
    if(!update){
      throw new Error("Failed to delete view type");
    }
    console.log('AuditService.log - DELETE view type:', {
      action: 'DELETE',
      viewId: viewId.toString(),
      userId: view.createdBy.userId.toString()
    });
    await AuditService.log({
      action: "DELETE",
      noteId: viewId.toString(),
      userId: view.createdBy.userId.toString(),
      userEmail: view.createdBy.userEmail,
      userName: view.createdBy.userName,
      noteName: view.title,
      serviceType: "MONGODB",
      field: "view-type",
      oldValue: undefined,
      newValue: viewTypeToDelete.viewType,
      workspaceId: view.workspaceId,
      organizationDomain: view.organizationDomain,
    });
    return { success: true };
  },
  async addComment({ commenterId, commenterName, commenterEmail, text, noteId, mediaMetaData }: { commenterId: string; commenterName: string; commenterEmail: string; text: string; noteId: string; mediaMetaData?: Array<{ id: string; name: string; url: string; size?: number; mimeType?: string; uploadedAt?: string }> }) {
    const client = await clientPromise();
    const db = client.db();
    const noteCollection = db.collection<INote>("notes");
    const note = await noteCollection.findOne({ _id: new ObjectId(noteId) });
    if(!note){
      throw new Error("Note not found");
    }
    const comment = {
      commentId: new ObjectId(),
      commenterId,
      commenterName,
      commenterEmail,
      text,
      createdAt: new Date(),
      ...(mediaMetaData && mediaMetaData.length > 0 ? { mediaMetaData } : {}),
    };
    await noteCollection.updateOne({ _id: new ObjectId(noteId) }, { $push: { comments: comment } });
    return { success: true ,comment:comment};
  },
  async deleteComment({ commentId, noteId }: { commentId: string; noteId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const noteCollection = db.collection<INote>("notes");
    
    // Use MongoDB's $pull operator to remove the comment by commentId
    const result = await noteCollection.updateOne(
      { _id: new ObjectId(noteId) }, 
      { $pull: { comments: { commentId: new ObjectId(commentId) } } }
    );
    
    if (result.matchedCount === 0) {
      throw new Error("Note not found");
    }
    
    if (result.modifiedCount === 0) {
      throw new Error("Comment not found");
    }

    const note = await noteCollection.findOne({ _id: new ObjectId(noteId) });
    if(!note){
      throw new Error("Note not found");
    }
    const user = await UserService.findUserByEmail({ email: note.userEmail });
    const userName = user?.name || '';
    await AuditService.log({
      action: "DELETE",
      noteId: noteId.toString(),
      userId: note.userId.toString(),
      userEmail: note.userEmail,
      userName,
      noteName: note.title || "",
      serviceType: "MONGODB",
      field: "comment",
      oldValue: undefined,
      newValue: undefined,
      workspaceId: note.workspaceId || "",
      organizationDomain: note.organizationDomain || "",
    });
    return { success: true};
  },
  async updateComment({ commentId, text, noteId }: { commentId: string; text: string; noteId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const noteCollection = db.collection<INote>("notes");
    const comment = {
      commentId: new ObjectId(commentId),
      text: text,
      updatedAt: new Date(),
    };
    // Use MongoDB's positional operator to update the specific comment
    const result = await noteCollection.updateOne(
      { 
        _id: new ObjectId(noteId), 
        "comments.commentId": new ObjectId(commentId) 
      },
      { 
        $set: { 
          "comments.$.text": text,
          "comments.$.updatedAt": comment.updatedAt
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      throw new Error("Note not found");
    }
    
    if (result.modifiedCount === 0) {
      throw new Error("Comment not found");
    }
    const note = await noteCollection.findOne({ _id: new ObjectId(noteId) });
    if(!note){
      throw new Error("Note not found");
    }
    //take a reference of the INOTE
    console.log('AuditService.log - UPDATE comment:', {
      action: 'UPDATE',
      noteId: noteId.toString(),
      userId: note.userId.toString()
    });
    const user = await UserService.findUserByEmail({ email: note.userEmail });
    const userName = user?.name || '';
    await AuditService.log({
      action: "UPDATE",
      noteId: noteId.toString(),
      userId: note.userId.toString(),
      userEmail: note.userEmail,
      userName,
      noteName: note.title || "",
      serviceType: "MONGODB",
      field: "comment",
      oldValue: undefined,
      newValue: comment.text,
      workspaceId: note.workspaceId || "",
      organizationDomain: note.organizationDomain || "",
    });
    return { success: true, comment:comment };
  },
  async reOrderSchema({ dataSourceId, order, userId, userEmail, userName, viewId }: { dataSourceId: string; order: string[]; userId: string; userEmail: string; userName: string; viewId?: string }) {
    const client = await clientPromise();
    const db = client.db();
    const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");

    const databaseSource = await databaseSourcesCollection.findOne({
      _id: new ObjectId(dataSourceId),
    });
    if (!databaseSource) {
      throw new Error("Database source not found");
    }
  
    // Step 1: Create a new object in the requested order (from source, not view)
    const reordered: Record<string, any> = {};
    const sourceProperties = databaseSource.properties || {};
  
    for (const propId of order) {
      if (sourceProperties[propId]) {
        reordered[propId] = sourceProperties[propId];
      }
    }
  
    // Step 2: Append any properties not listed in order[] (to not lose them)
    for (const [propId, value] of Object.entries(sourceProperties)) {
      if (!reordered[propId]) {
        reordered[propId] = value;
      }
    }
  
    // Step 3: Save reordered properties in IDatabaseSource (not in IVeiwDatabase)
    const update = await databaseSourcesCollection.updateOne(
      { _id: new ObjectId(dataSourceId) },
      { $set: { properties: reordered, updatedAt: new Date() } }
    );
  
    if (!update.modifiedCount) {
      throw new Error("Failed to reorder schema");
    }

    // Fetch updated data source
    const updatedDataSource = await databaseSourcesCollection.findOne({
      _id: new ObjectId(dataSourceId),
    });
    if (!updatedDataSource) {
      throw new Error("Failed to retrieve updated data source");
    }
  
    // Log audit (viewId is optional for audit purposes)
    await AuditService.log({
      action: "REORDER",
      noteId: dataSourceId,
      userId,
      userEmail,
      userName,
      noteName: databaseSource?.title || "New DataSource",
      serviceType: "MONGODB",
      field: "property",
      oldValue: undefined,
      newValue: reordered,
      workspaceId: databaseSource?.workspaceId,
      organizationDomain: undefined,
    });
    
    return { 
      success: true,
      dataSource: updatedDataSource
    };
  },
  
  async addViewType({ viewId, viewTypes, addToViewType }: { viewId: string; viewTypes: ViewTypeWithIconAndTitle[]; addToViewType: ViewType | "" }) {
    const client = await clientPromise();
    const db = client.db();
    const viewCollection = await db.collection<IVeiwDatabase>("viewDatabases");
    const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");
    
    if(addToViewType==""){
      throw new Error("View type not found");
    }
    
    // Get view first to access existing databaseSourceId
    const view = await viewCollection.findOne({ _id: new ObjectId(viewId) });
    if(!view){
      throw new Error("View not found");
    }
    
    // Get databaseSourceId from existing view (if any)
    let databaseSourceId = view.viewsType && view.viewsType.length > 0 
      ? view.viewsType[0]?.databaseSourceId 
      : null;
    
    // Convert databaseSourceId to ObjectId if it's a string
    let databaseSourceIdObjectId: ObjectId | null = null;
    if (databaseSourceId) {
      try {
        databaseSourceIdObjectId = typeof databaseSourceId === "string" 
          ? new ObjectId(databaseSourceId) 
          : databaseSourceId instanceof ObjectId 
            ? databaseSourceId 
            : new ObjectId(String(databaseSourceId));
      } catch (err) {
        console.error("Invalid databaseSourceId format:", databaseSourceId, err);
        databaseSourceIdObjectId = null;
      }
    }
    
    // For calendar and timeline views, ensure date property exists
    if(addToViewType=="timeline"||addToViewType=="calendar"){
      // Need a databaseSourceId to check/add date property
      if (!databaseSourceIdObjectId) {
        throw new Error("Database source not found. Please add a data source to the board first.");
      }

      try {
        const databaseSource = await databaseSourcesCollection.findOne({
          _id: databaseSourceIdObjectId,
        });
        if (!databaseSource) {
          console.error(`Database source lookup failed. ID: ${databaseSourceIdObjectId.toString()}, Original: ${databaseSourceId}`);
          // Instead of throwing, log a warning and continue - the date property will be added when needed
          console.warn(`Database source not found for calendar/timeline view. The view will be created but date property may need to be added manually.`);
        } else {
          // Check properties from source (not view)
          const sourceProperties = databaseSource.properties || {};
          const dateProperty = Object.values(sourceProperties).some(p => p?.type === "date");
          if(!dateProperty){
            const datePropertyId = `prop_${new ObjectId()}`;
            // Add date property to IDatabaseSource (not IVeiwDatabase)
            await databaseSourcesCollection.updateOne(
              { _id: databaseSourceIdObjectId },
              { 
                $set: { 
                  [`properties.${datePropertyId}`]: { name: "Date", type: "date" },
                  updatedAt: new Date()
                } 
              }
            ); 
          }
        }
      } catch (err) {
        // Log error but don't block view creation - the date property can be added later
        console.error("Error checking/adding date property for calendar/timeline view:", err);
        console.warn(`Continuing with view creation despite date property setup error. Date property may need to be added manually.`);
      }
    }
    
    // Ensure all viewTypes have _id AND databaseSourceId in one go
    const viewTypesWithIdsAndSource = viewTypes.map(vt => {
      // Ensure _id is ObjectId format
      const vtId = vt._id 
        ? (typeof vt._id === "string" ? new ObjectId(vt._id) : vt._id)
        : new ObjectId();
      
      return {
        ...vt,
        _id: vtId,
        databaseSourceId: vt.databaseSourceId || databaseSourceId || vtId
      };
    });
    
    // Single update with both _id and databaseSourceId
    const update = await viewCollection.updateOne(
      { _id: new ObjectId(String(viewId)) },
      { $set: { viewsType: viewTypesWithIdsAndSource } },
    );
    if(!update){
      throw new Error("Failed to add view type");
    }
    
    // Insert/update in viewTypes collection
    const viewTypesCollection = db.collection<IViewType>("viewTypes");
    const viewDatabaseId = new ObjectId(viewId);
    
    const viewTypesToInsert = viewTypesWithIdsAndSource.map(vt => ({
      _id: vt._id,
      viewType: vt.viewType,
      icon: vt.icon,
      title: vt.title,
      databaseSourceId: vt.databaseSourceId,
      viewDatabaseId: viewDatabaseId,
      settings: {}
    }));
    
    // Insert all new viewTypes (use upsert to handle duplicates) - bulk operation
    if (viewTypesToInsert.length > 0) {
      const bulkOps: AnyBulkWriteOperation<IViewType>[] = viewTypesToInsert.map((viewTypeToInsert) => ({
        updateOne: {
          filter: { _id: viewTypeToInsert._id },
          update: { $set: viewTypeToInsert },
          upsert: true,
        },
      }));
      await viewTypesCollection.bulkWrite(bulkOps, { ordered: false });
    }
    
    const updatedView = await viewCollection.findOne({ _id: new ObjectId(viewId) });
    if(!updatedView){
      throw new Error("View not found");
    }
    
    await AuditService.log({
      action: "CREATE",
      noteId: viewId.toString(),
      userId: updatedView.createdBy.userId.toString(),
      userEmail: updatedView.createdBy.userEmail,
      userName: updatedView.createdBy.userName,
      noteName: updatedView.title,
      serviceType: "MONGODB",
      field: "view-type",
      oldValue: undefined,
      newValue: viewTypes,
      workspaceId: updatedView.workspaceId,
      organizationDomain: updatedView.organizationDomain,
    });
    return { success: true, view: updatedView };
  },
  async updateViewName({ viewId, title }: { viewId: string; title: string }) {
    const client = await clientPromise();
    const db = client.db();
    const viewCollection = await db.collection<IVeiwDatabase>("viewDatabases");
    
    // First, get the view to check for defaultDataSourceId
    const view = await viewCollection.findOne({ _id: new ObjectId(viewId) });
    if(!view){
      throw new Error("View not found");
    }
    
    // Update the view title
    const update = await viewCollection.updateOne(
      { _id: new ObjectId(String(viewId)) },
      { $set: { title: title } },
    );
    
    // If the view has a defaultDataSourceId, update the datasource title as well
    if (view.defaultDataSourceId) {
      const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");
      await databaseSourcesCollection.updateOne(
        { _id: view.defaultDataSourceId },
        { 
          $set: { 
            title: title,
            updatedAt: new Date()
          } 
        },
      );
    }
    
    console.log('AuditService.log - UPDATE view name:', {
      action: 'UPDATE',
      viewId: viewId.toString(),
      userId: view.createdBy.userId.toString()
    });
    await AuditService.log({
      action: "UPDATE",
      noteId: viewId.toString(),
      userId: view.createdBy.userId.toString(),
      userEmail: view.createdBy.userEmail,
      userName: view.createdBy.userName,
      noteName: view.title,
      serviceType: "MONGODB",
      field: "view-title",
      oldValue: undefined,
      newValue: title,
      workspaceId: view.workspaceId,
      organizationDomain: view.organizationDomain,
    });
    return { success: true };
  },

  async deleteProperty({ dataSourceId, propertyId, userId, userEmail, userName }: { dataSourceId: string; propertyId: string; userId: string; userEmail: string; userName: string }) {
    const client = await clientPromise();
    const db = client.db();
    const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");
    
    // Verify data source exists
    const dataSource = await databaseSourcesCollection.findOne({ _id: new ObjectId(dataSourceId) });
    if (!dataSource) {
      throw new Error("Data source not found");
    }
    
    // Verify property exists
    if (!dataSource.properties || !dataSource.properties[propertyId]) {
      throw new Error("Property not found in data source");
    }
    
    // Delete property from IDatabaseSource
    const result = await databaseSourcesCollection.updateOne(
      { _id: new ObjectId(dataSourceId) },
      { 
        $unset: { [`properties.${propertyId}`]: "" },
        $set: { updatedAt: new Date() }
      },
    );
    if (result.modifiedCount === 0) {
      throw new Error("Failed to delete property");
    }
    
    // Delete the property from the note collection (notes are stored with databaseViewId = dataSourceId)
    const noteCollection = db.collection<INote>("notes");
    await noteCollection.updateMany(
      {
        databaseViewId: new ObjectId(dataSourceId),
        databaseProperties: { $exists: true, $ne: {} },
      },
      { $unset: { [`databaseProperties.${propertyId}`]: "" } },
    );
    
    // Fetch updated data source
    const updatedDataSource = await databaseSourcesCollection.findOne({ _id: new ObjectId(dataSourceId) });
    if (!updatedDataSource) {
      throw new Error("Failed to retrieve updated data source");
    }
    
    // Fetch updated notes
    const updatedNotes = await noteCollection.find({ databaseViewId: new ObjectId(dataSourceId) }).toArray();
    
    // Formula support removed - no recalculation needed

    // Log audit for property deletion
    console.log('AuditService.log - DELETE property:', {
      action: 'DELETE',
      dataSourceId: dataSourceId,
      userId,
      userEmail,
      userName,
      resource: dataSource?.title || "Unknown Data Source",
      source: 'MONGODB'
    });
    await AuditService.log({
      action: "DELETE",
      noteId: dataSourceId,
      userId,
      userEmail,
      userName,
      noteName: dataSource?.title || "Unknown Data Source",
      serviceType: "MONGODB",
      field: "property",
      oldValue: undefined,
      newValue: propertyId,
      workspaceId: dataSource?.workspaceId,
      organizationDomain: undefined,
    });

    return { 
      success: true, 
      dataSource: updatedDataSource,
      notes: updatedNotes
    };
  },

  async deleteView({ viewId, userId, userEmail, userName }: { viewId: string; userId: string; userEmail: string; userName: string }) {
    const client = await clientPromise();
    const db = client.db();
    const viewCollections = db.collection<IVeiwDatabase>("viewDatabases");
    const viewTypesCollection = db.collection<IViewType>("viewTypes");
    
    // Get view info for audit before deletion
    const view = await viewCollections.findOne({ _id: new ObjectId(viewId) });
    
    // Delete all associated viewTypes from viewTypes collection
    if (view && view.viewsType) {
      const viewTypeIds = view.viewsType
        .map(vt => {
          if (!vt._id) return null;
          return typeof vt._id === "string" ? new ObjectId(vt._id) : vt._id;
        })
        .filter((id): id is ObjectId => id !== null);
      if (viewTypeIds.length > 0) {
        await viewTypesCollection.deleteMany({ _id: { $in: viewTypeIds } });
      }
    }
    
    const result = await viewCollections.deleteOne({
      _id: new ObjectId(viewId),
    });
    const noteCollection = db.collection<INote>("notes");
    await noteCollection.deleteMany({ databaseViewId: new ObjectId(viewId) });
    //not deleting from github yet
    if (!result.deletedCount) {
      throw new Error("Failed to delete view");
    }

    // Log audit for view deletion
    console.log('AuditService.log - DELETE view:', {
      action: 'DELETE',
      pageId: viewId,
      userId,
      userEmail,
      userName
    });
    await AuditService.log({
      action: "DELETE",
      noteId: viewId,
      userId,
      userEmail,
      userName,
      noteName: view?.title || "Unknown View",
      serviceType: "MONGODB",
      field: "view",
      oldValue: undefined,
      newValue: viewId,
      workspaceId: view?.workspaceId,
      organizationDomain: view?.organizationDomain,
    });

    return { success: true };
  },

  async createView({ viewData, noteId, isSprint }: {
    viewData: {
      workspaceId: string;
      title: string;
      description?: string;
      createdBy: {
        userId: string;
        userName: string;
        userEmail: string;
      };
      viewsType: ViewTypeWithIconAndTitle[];
      organizationDomain?: string;
    };
    noteId?: string;
    isSprint?: boolean;
  }) {
    const client = await clientPromise();
    const db = client.db();
    
    // Step 1: Create IDatabaseSource (the actual database with properties)
    const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");
    const statusPropertyId = `prop_${new ObjectId()}`;
    const datePropertyId = `prop_${new ObjectId()}`;
    let properties: Record<string, PropertySchema> = {};
    properties = {
      [statusPropertyId]: {
        name: "status",
        type: "status",
        default: true,
        options: [
          { id: `opt_${new ObjectId()}`, name: "Todo", color: "blue" },
          { id: `opt_${new ObjectId()}`, name: "In Progress", color: "green" },
          { id: `opt_${new ObjectId()}`, name: "Done", color: "gray" },
        ],
      },
      [datePropertyId]: {
        name: "Date",
        type: "date",
        default: true,
      },
    };
    
    // Create default datasource with the same title as the board
    const newDatabaseSource: IDatabaseSource = {
      title: viewData.title || "New DataSource", // Use board title for default datasource
      createdBy: {
        userId: new ObjectId(viewData.createdBy.userId),
        userName: viewData.createdBy.userName,
        userEmail: viewData.createdBy.userEmail,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      properties: properties,
      settings: {},
      workspaceId: viewData.workspaceId,
      isSprint: isSprint || false,
    };

    const sourceResult = await databaseSourcesCollection.insertOne(newDatabaseSource);
    if (!sourceResult.insertedId) {
      throw new Error("Failed to create database source");
    }

    const databaseSourceId = sourceResult.insertedId;

    // Step 2: Create IVeiwDatabase with viewsType that reference the source
    const viewCollections = db.collection<IVeiwDatabase>("viewDatabases");
    
    // Map viewsType to include databaseSourceId and _id for each view
    const viewsTypeWithSource: ViewTypeWithIconAndTitle[] = viewData.viewsType.map((viewType) => ({
      _id: new ObjectId(), // Generate unique ID for each view
      viewType: viewType.viewType,
      icon: viewType.icon,
      title: viewType.title,
      databaseSourceId: databaseSourceId,
    }));
    
    const newView: IVeiwDatabase = {
      title: viewData.title,
      noteId: noteId || "",
      createdBy: {
        userId: new ObjectId(viewData.createdBy.userId),
        userName: viewData.createdBy.userName,
        userEmail: viewData.createdBy.userEmail,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      viewsType: viewsTypeWithSource,
      workspaceId: viewData.workspaceId,
      organizationDomain: viewData.organizationDomain,
      isSprint: isSprint || false,
      defaultDataSourceId: databaseSourceId, // Store default datasource ID for reference
    };

    const result = await viewCollections.insertOne(newView);
    if (!result.insertedId) {
      throw new Error("Failed to create view");
    }

    // Insert all viewTypes into viewTypes collection
    const viewTypesCollection = db.collection<IViewType>("viewTypes");
    const viewTypesToInsert: IViewType[] = viewsTypeWithSource.map(vt => {
      if (!vt._id) {
        throw new Error("View type must have an _id");
      }
      if (!vt.databaseSourceId) {
        throw new Error("View type must have a databaseSourceId");
      }
      return {
        _id: vt._id,
        viewType: vt.viewType,
        icon: vt.icon,
        title: vt.title,
        databaseSourceId: vt.databaseSourceId,
        viewDatabaseId: result.insertedId,
        settings: {},
        formIcon: vt.formIcon,
        formCoverImage: vt.formCoverImage,
      };
    });
    
    if (viewTypesToInsert.length > 0) {
      await viewTypesCollection.insertMany(viewTypesToInsert);
    }

    // Return the created view
    const createdView = await viewCollections.findOne({
      _id: result.insertedId,
    });
    if (!createdView) {
      throw new Error("Failed to retrieve created view");
    }

    // Log audit for view creation
    await AuditService.log({
      action: "CREATE",
      noteId: result.insertedId.toString(),
      userId: viewData.createdBy.userId,
      userEmail: viewData.createdBy.userEmail,
      userName: viewData.createdBy.userName,
      noteName: viewData.title,
      serviceType: "MONGODB",
      field: "view",
      oldValue: undefined,
      newValue: viewData.title,
      workspaceId: viewData.workspaceId,
      organizationDomain: undefined,
    });

    return createdView;
  },

  async addPropertyToView({ dataSourceId, propertyData, userId, userEmail, userName, viewId }: {
    dataSourceId: string;
    propertyData: {
      name: string;
      type: PropertyType;
      options?: PropertyOption[];
      linkedDatabaseId?: ObjectId;
      syncedPropertyId?: string;
      syncedPropertyName?: string;
      relationLimit?: "single" | "multiple";
      displayProperties?: string[];
      twoWayRelation?: boolean;
      rollup?: {
        relationPropertyId?: string;
        relationDataSourceId?: ObjectId;
        targetPropertyId?: string;
        calculation?: {
          category: "original" | "count" | "percent";
          value: "original" | "all" | "per_group" | "empty" | "non_empty";
          metadata?: {
            displayFormat?: "number" | "bar" | "ring";
            [key: string]: any;
          };
        };
        selectedOptions?: string[];
      };
      githubPrConfig?: GitHubPrConfig;
    };
    userId: string;
    userEmail: string;
    userName: string;
    viewId?: string;
  }) {
    const client = await clientPromise();
    const db = client.db();
    const viewCollections = db.collection<IVeiwDatabase>("viewDatabases");
    const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");

    // Get database source directly
    const databaseSource = await databaseSourcesCollection.findOne({
      _id: new ObjectId(dataSourceId),
    });
    if (!databaseSource) {
      throw new Error("Database source not found");
    }

    // Get view for audit if viewId provided
    let viewCollection: IVeiwDatabase | null = null;
    if (viewId) {
      viewCollection = await viewCollections.findOne({
        _id: new ObjectId(viewId),
      });
    }

    const propertyId = `prop_${new ObjectId()}`;

    // Create property schema
    const propertySchema: PropertySchema = {
      name: propertyData.name,
      type: propertyData.type,
    };

    // Normalize option IDs to ensure they use proper ObjectId format
    const normalizeOptions = (opts: PropertyOption[] | undefined): PropertyOption[] => {
      if (!opts) return [];
      return opts.map((opt) => {
        // Check if option ID is already in proper format (opt_ followed by ObjectId)
        if (opt.id && opt.id.startsWith("opt_") && opt.id.length > 4) {
          const idPart = opt.id.substring(4);
          // Validate if it's a valid ObjectId format (24 hex characters)
          if (/^[0-9a-fA-F]{24}$/.test(idPart)) {
            return opt; // Already has proper ID
          }
        }
        // Generate new proper ObjectId-based ID
        return {
          ...opt,
          id: `opt_${new ObjectId()}`,
        };
      });
    };

    // Set default options based on type
    if (propertyData.type === "status") {
      propertySchema.options = [
        { id: `opt_${new ObjectId()}`, name: "In Progress", color: "green" },
        { id: `opt_${new ObjectId()}`, name: "Todo", color: "blue" },
        { id: `opt_${new ObjectId()}`, name: "Done", color: "gray" },
      ];
    }
    if (propertyData.type === "priority") {
      propertySchema.options = [
        { id: `opt_${new ObjectId()}`, name: "Low", color: "green" },
        { id: `opt_${new ObjectId()}`, name: "Medium", color: "yellow" },
        { id: `opt_${new ObjectId()}`, name: "High", color: "red" },
      ];
    }
    if (propertyData.type === "select" || propertyData.type === "multi_select") {
      propertySchema.options = normalizeOptions(propertyData.options);
    }
    
    // Relation-specific fields
    if (propertyData.type === "relation") {
      if (propertyData.linkedDatabaseId) {
        propertySchema.linkedDatabaseId = propertyData.linkedDatabaseId;
      }
      if (propertyData.syncedPropertyId) {
        propertySchema.syncedPropertyId = propertyData.syncedPropertyId;
      }
      if (propertyData.syncedPropertyName) {
        propertySchema.syncedPropertyName = propertyData.syncedPropertyName;
      }
      propertySchema.relationLimit = propertyData.relationLimit || "multiple";
      if (propertyData.displayProperties) {
        propertySchema.displayProperties = propertyData.displayProperties;
      }
    }
    if (propertyData.type === "rollup") {
      propertySchema.rollup = {
        relationPropertyId: propertyData.rollup?.relationPropertyId,
        relationDataSourceId: propertyData.rollup?.relationDataSourceId,
        targetPropertyId: propertyData.rollup?.targetPropertyId,
        calculation: propertyData.rollup?.calculation || { category: "original", value: "original" },
        selectedOptions: propertyData.rollup?.selectedOptions,
      };
    }

    if (propertyData.githubPrConfig) {
      propertySchema.githubPrConfig = propertyData.githubPrConfig;
    }

    propertySchema.showProperty = propertySchema.showProperty ?? true;
    
    // Check if this is the first property of this type
    const isDefault = await checkDefault(dataSourceId, propertyData.type, databaseSource);
    propertySchema.default = isDefault;

    // Update properties in IDatabaseSource (not in IVeiwDatabase)
    const updatedProperties = {
      ...databaseSource.properties,
      [propertyId]: propertySchema,
    };

    const updateResult = await databaseSourcesCollection.updateOne(
      { _id: new ObjectId(dataSourceId) },
      {
        $set: {
          properties: updatedProperties,
          updatedAt: new Date(),
        },
      },
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error("Failed to add property to database source");
    }

    // Get updated source
    const updatedSource = await databaseSourcesCollection.findOne({
      _id: new ObjectId(dataSourceId),
    });
    if (!updatedSource) {
      throw new Error("Failed to retrieve updated database source");
    }

    // Formula support removed - no recalculation needed

    // Log audit for property creation (use viewCollection if available, otherwise use dataSource)
    if (viewCollection) {
      await AuditService.log({
        action: "CREATE",
        noteId: viewCollection.noteId || "",
        userId,
        userEmail,
        userName,
        noteName: propertyData.name,
        serviceType: "MONGODB",
        field: "property",
        oldValue: undefined,
        newValue: propertyData.name,
        workspaceId: viewCollection.workspaceId,
        organizationDomain: viewCollection.organizationDomain,
      });
    }

    // Handle two-way relation: create reverse property in linked datasource
    let reverseProperty: PropertySchema | null = null;
    let reverseDataSource: IDatabaseSource | null = null;
    
    if (propertyData.type === "relation" && propertyData.twoWayRelation && propertyData.linkedDatabaseId) {
      try {
        // Get the linked datasource
        const linkedDataSource = await databaseSourcesCollection.findOne({
          _id: propertyData.linkedDatabaseId,
        });
        
        if (!linkedDataSource) {
          console.warn("Linked datasource not found for two-way relation");
        } else {
          // Get the current datasource title for the reverse property name
          const currentDataSourceTitle = databaseSource.title || "Untitled";
          
          // Create reverse property schema
          const reversePropertyId = `prop_${new ObjectId()}`;
          const reversePropertySchema: PropertySchema = {
            name: currentDataSourceTitle, // Use current datasource title as property name
            type: "relation",
            linkedDatabaseId: new ObjectId(dataSourceId), // Swap: link back to current datasource
            syncedPropertyId: propertyId, // Reference to the original property
            syncedPropertyName: propertyData.name, // Reference to the original property name
            relationLimit: propertyData.relationLimit || "multiple",
            showProperty: true,
            formMetaData: {
              isFiedRequired: false,
              isDescriptionRequired: false,
              isLongAnswerRequired: false,
            },
          };
          
          // Check if this is the first relation property in the linked datasource
          const isDefaultReverse = await checkDefault(
            propertyData.linkedDatabaseId.toString(),
            "relation",
            linkedDataSource
          );
          reversePropertySchema.default = isDefaultReverse;
          
          // Update properties in linked datasource
          const updatedReverseProperties = {
            ...linkedDataSource.properties,
            [reversePropertyId]: reversePropertySchema,
          };
          
          const reverseUpdateResult = await databaseSourcesCollection.updateOne(
            { _id: propertyData.linkedDatabaseId },
            {
              $set: {
                properties: updatedReverseProperties,
                updatedAt: new Date(),
              },
            },
          );
          
          if (reverseUpdateResult.modifiedCount > 0) {
            // Get updated linked datasource
            const updatedLinkedSource = await databaseSourcesCollection.findOne({
              _id: propertyData.linkedDatabaseId,
            });
            
            if (updatedLinkedSource) {
              reverseProperty = reversePropertySchema;
              reverseDataSource = updatedLinkedSource;
              
              // Update the original property with synced property info
              propertySchema.syncedPropertyId = reversePropertyId;
              propertySchema.syncedPropertyName = currentDataSourceTitle;
              
              // Update the original datasource with synced property info
              const finalUpdatedProperties = {
                ...updatedSource.properties,
                [propertyId]: propertySchema,
              };
              
              await databaseSourcesCollection.updateOne(
                { _id: new ObjectId(dataSourceId) },
                {
                  $set: {
                    properties: finalUpdatedProperties,
                    updatedAt: new Date(),
                  },
                },
              );
              
              // Get final updated source
              const finalUpdatedSource = await databaseSourcesCollection.findOne({
                _id: new ObjectId(dataSourceId),
              });
              
              if (finalUpdatedSource) {
                return {
                  property: propertySchema,
                  dataSource: finalUpdatedSource,
                  reverseProperty: reversePropertySchema,
                  reverseDataSource: updatedLinkedSource,
                };
              }
            }
          }
        }
      } catch (error) {
        console.error("Error creating two-way relation:", error);
        // Continue even if two-way relation fails - the main property is already created
      }
    }

    return {
      property: propertySchema,
      dataSource: updatedSource, // Return updated data source with new properties
      reverseProperty: reverseProperty || undefined,
      reverseDataSource: reverseDataSource || undefined,
    };
  },
  async getCollectionById({ viewId }: { viewId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const viewCollections = db.collection<IVeiwDatabase>("viewDatabases");
    const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");
    
    const viewCollection = await viewCollections.findOne({
      _id: new ObjectId(viewId),
    });
    if (!viewCollection) {
      throw new Error("View not found");
    }
    
    // Get database source from view
    let databaseSource: IDatabaseSource | null = null;
    if (viewCollection.viewsType && viewCollection.viewsType.length > 0) {
      const databaseSourceId = viewCollection.viewsType[0]?.databaseSourceId;
      if (databaseSourceId) {
        databaseSource = await databaseSourcesCollection.findOne({
          _id: databaseSourceId,
        });
      }
    }
    
    const noteCollection = await db.collection<INote>("notes");
    //here we will be desplaying the notes of the first viewtype sourceID 
    // Notes are linked to the database source, not the view
    // Determine the source ID: if view has sourceDatabaseId, use that; otherwise view IS the source
    const sourceId = (viewCollection as any)?.sourceDatabaseId 
      ? new ObjectId((viewCollection as any).sourceDatabaseId)
      : (viewCollection?._id || new ObjectId(viewId));
    
    const notes = await noteCollection
      .find({ databaseViewId: sourceId })
      .toArray();
    let processedNotes: INote[] = notes;

    if (databaseSource) {
      const runtime = buildFormulaRuntime(databaseSource);
      if (runtime.hasFormulas && notes.length > 0) {
        const computed = runtime.recomputeFormulasForNotes(notes);
        const bulkUpdates: AnyBulkWriteOperation<INote>[] = [];

        processedNotes = computed.map(({ note: computedNote }) => {
          if (computedNote._id) {
            const objectId =
              typeof computedNote._id === "string"
                ? new ObjectId(computedNote._id)
                : computedNote._id;
            const updateDoc: Record<string, any> = {
              $set: {
                databaseProperties: computedNote.databaseProperties ?? {},
              },
            };
            if (computedNote.formulaErrors && Object.keys(computedNote.formulaErrors).length > 0) {
              updateDoc.$set.formulaErrors = computedNote.formulaErrors;
            } else {
              updateDoc.$unset = { formulaErrors: "" };
            }

            bulkUpdates.push({
              updateOne: {
                filter: { _id: objectId },
                update: updateDoc,
              },
            });
          }
          return {
            ...computedNote,
          } as INote;
        });

        if (bulkUpdates.length > 0) {
          await noteCollection.bulkWrite(bulkUpdates, { ordered: false });
        }
      }
    }

    // Return view collection with properties from source
    return { 
      viewCollection: {
        ...viewCollection,
        properties: databaseSource?.properties || {},
      }, 
      note: processedNotes 
    };
  },

  async updatePropertyValue({ dataSourceId, pageId, propertyId, value, currentUser, workspaceName, viewId }: {
    dataSourceId: string;
    pageId: string;
    propertyId: string;
    value: any;
    currentUser: IUser;
    workspaceName?: string;
    viewId?: string;
  }) {
    if(!currentUser.name ){
      throw new Error("Current user name is required");
    }
    const client = await clientPromise();
    const db = client.db();
    const viewCollections = db.collection<IVeiwDatabase>("viewDatabases");
    const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");
    const noteCollection = db.collection<INote>("notes");
    const notifications = db.collection<INotification>("notifications");
    const users = db.collection<IUser>("users");
    
    // Get database source directly
    const databaseSource = await databaseSourcesCollection.findOne({
      _id: new ObjectId(dataSourceId),
    });
    if (!databaseSource) {
      throw new Error("Data source not found");
    }

    // Verify property exists in source
    const sourceProperties = databaseSource.properties || {};
    if (!sourceProperties[propertyId]) {
      throw new Error("Property not found in database source");
    }

    // Get view for audit if viewId provided
    let view: IVeiwDatabase | null = null;
    if (viewId) {
      view = await viewCollections.findOne({ _id: new ObjectId(viewId) });
    }

    const propertySchema = databaseSource.properties?.[propertyId];

    // Find the page/note by pageId (notes are stored with databaseViewId = dataSourceId, not viewId)
    const note : INote | null = await noteCollection.findOne({
      _id: new ObjectId(pageId),
    });

    if (!note) {
      throw new Error("Page not found");
    }

    // Verify the note belongs to this data source
    if (!note.databaseViewId || !note.databaseViewId.equals(new ObjectId(dataSourceId))) {
      throw new Error("Page not found in this data source");
    }
    // Check if the property is of type "person"
    const propertyType = databaseSource.properties?.[propertyId]?.type;
    let valueToPersist: any = value;
    const additionalPropertyValues: Record<string, any> = {};

    if (propertyType === "github_pr") {
      const currentUserId = resolveUserIdForGithub(currentUser);
      console.log(
        `[GitHub PR] Updating PR property. Config:`,
        JSON.stringify(propertySchema?.githubPrConfig, null, 2),
      );
      const { persistedValue, statusUpdate } = await prepareGithubPrValue({
        rawValue: value,
        config: propertySchema?.githubPrConfig,
        currentUserId,
        sourceProperties,
      });
      valueToPersist = persistedValue;
      if (statusUpdate) {
        if (statusUpdate.propertyId !== propertyId) {
          console.log(
            `[GitHub PR] Applying status update: ${statusUpdate.propertyId} = "${statusUpdate.value}" (current propertyId: ${propertyId})`,
          );
          additionalPropertyValues[statusUpdate.propertyId] = statusUpdate.value;
          console.log(
            `[GitHub PR] Additional property values to apply:`,
            JSON.stringify(additionalPropertyValues, null, 2),
          );
        } else {
          console.log(
            `[GitHub PR] Status update skipped - same propertyId (${statusUpdate.propertyId} === ${propertyId}). Status property cannot be the same as GitHub PR property.`,
          );
        }
      } else {
        console.log(`[GitHub PR] No status update computed - check logs above for reason`);
      }
    }
let notificationOnAssigned;
if (propertyType === "person") {
  let assignedUsers = note.databaseProperties?.[propertyId] || [];

  // Normalize to array if a single object
  if (!Array.isArray(assignedUsers) && assignedUsers) {
    assignedUsers = [assignedUsers];
  }

  // Ensure value is an array
  const newValues = Array.isArray(value) ? value : [value];

  // Extract newly assigned users that weren't previously assigned
  const newlyAssignedUsers = newValues.filter(
    (user: any) => !assignedUsers.some((u: any) => u.userEmail === user.userEmail)
  );

  // Send email notifications only to newly assigned users
  console.log("newlyAssignedUsers", newlyAssignedUsers);
  newlyAssignedUsers.forEach((user: any) => {
    const subject = `📄 A Note Has Been Assigned To You`;
    const link = `${process.env.MAIL_LINK}/${note.databaseNoteId}`;
    const assignTemplate = getNoteAssignationHtml(note.title, link, currentUser.name || "");

    sendEmail({
      to: user.userEmail,
      subject,
      html: assignTemplate,
    });
  });
const notification : INotification = {
  sentTo: newlyAssignedUsers,
  createdAt: new Date(),
  noteId: note._id,
  noteTitle: note.title,
  workspaceId: new ObjectId(note.workspaceId || ""),
  workspaceName: workspaceName || "",
  type: "ASSIGN",
  createdBy: {
    userId: new ObjectId(currentUser.id),
    userName: currentUser.name || "",
    userEmail: currentUser.email || "",
  },
};
notificationOnAssigned = notification;
const result = await notifications.insertOne(notification);
if(!result.insertedId){
  throw new Error("Failed to add notification");
}
// Bulk update all users with notification - optimized to avoid N+1 queries
if (newlyAssignedUsers.length > 0) {
  const bulkOps: AnyBulkWriteOperation<IUser>[] = newlyAssignedUsers.map((user) => ({
    updateOne: {
      filter: { _id: new ObjectId(String(user.userId)) },
      update: { $addToSet: { notifications: result.insertedId } },
    },
  }));
  await users.bulkWrite(bulkOps, { ordered: false });
}

  
}
    const updatedProperties = {
      ...(note.databaseProperties ?? {}),
      ...additionalPropertyValues,
      [propertyId]: valueToPersist,
    };

    // Formula support removed - no recalculation needed
    const updateDoc: Record<string, any> = {
      $set: {
        databaseProperties: updatedProperties,
        updatedAt: new Date(),
      },
    };

    const persistedValue = updatedProperties[propertyId];

    const updateResult = await noteCollection.updateOne(
      { _id: new ObjectId(pageId) },
      updateDoc,
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error("Failed to update property value");
    }

    // Return updated page
    const updatedPage = await noteCollection.findOne({
      _id: new ObjectId(pageId),
    });
    if (!updatedPage) {
      throw new Error("Failed to retrieve updated page");
    }
   //log audit for property value update
   console.log('AuditService.log - UPDATE property value:', {
     action: 'UPDATE',
     pageId: pageId.toString(),
     userId: currentUser.id
   });
   // Log audit if view is available
  if (view) {
    await AuditService.log({
      action: "UPDATE",
      noteId: pageId.toString(),
      userId: view.createdBy.userId.toString(),
      userEmail: view.createdBy.userEmail,
      userName: view.createdBy.userName,
      noteName: view.title,
      serviceType: "MONGODB",
      field: "property-value",
      oldValue: undefined,
      newValue: value,
      workspaceId: view.workspaceId,
      organizationDomain: view.organizationDomain,
    });
  }
    return {
      page: updatedPage,
      propertyId,
      value: persistedValue,
      updatedAt: new Date(),
      notificationOnAssigned,
    };
  },

  async updatePropertySchema({ dataSourceId, propertyId, newName, type, options, showProperty, viewId, numberFormat, decimalPlaces, showAs, progressColor, progressDivideBy, showNumberText, formula, formulaReturnType, relationLimit, rollup, githubPrConfig, formMetaData }: {
    dataSourceId: string;
    propertyId: string;
    newName: string;
    type: PropertyType;
    options?: PropertyOption[];
    showProperty?: boolean;
    viewId?: string;
    // Number property settings
    numberFormat?: string;
    decimalPlaces?: number;
    showAs?: "number" | "bar" | "ring";
    progressColor?: string;
    progressDivideBy?: number;
    showNumberText?: boolean;
    // Formula property settings
    formula?: string;
    formulaReturnType?: "text" | "number" | "boolean" | "date";
    // Relation property settings
    relationLimit?: "single" | "multiple";
    rollup?: {
      relationPropertyId?: string;
      relationDataSourceId?: ObjectId;
      targetPropertyId?: string;
      calculation?: {
        category: "original" | "count" | "percent";
        value: "original" | "all" | "per_group" | "empty" | "non_empty";
        metadata?: {
          displayFormat?: "number" | "bar" | "ring";
          [key: string]: any;
        };
      };
      selectedOptions?: string[];
    };
    githubPrConfig?: GitHubPrConfig | null;
    // Form metadata
    formMetaData?: {
      isFiedRequired?: boolean;
      isDescriptionRequired?: boolean;
      Description?: string;
      isLongAnswerRequired?: boolean;
      checkboxLabel?: string;
    };
  }) 
  {
    const client = await clientPromise();
    const db = client.db();
    const viewCollections = db.collection<IVeiwDatabase>("viewDatabases");
    const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");

    // Get database source directly
    const databaseSource = await databaseSourcesCollection.findOne({
      _id: new ObjectId(dataSourceId),
    });
    if (!databaseSource) {
      throw new Error("Data source not found");
    }

    // Verify property exists
    if (!databaseSource.properties || !databaseSource.properties[propertyId]) {
      throw new Error("Property not found in database source");
    }

    // Get view for audit if viewId provided
    let view: IVeiwDatabase | null = null;
    if (viewId) {
      view = await viewCollections.findOne({ _id: new ObjectId(viewId) });
    }
    
    const sourceProperties = databaseSource.properties || {};
    let isDefault = sourceProperties[propertyId]?.default;
    const defaultType = sourceProperties[propertyId]?.type;
    if (defaultType != type) {
      isDefault = await checkDefault(dataSourceId, type, databaseSource);
    }
    
    // Update property in source (not in view)
    const existingProperty = sourceProperties[propertyId];
    if (!existingProperty) {
      throw new Error("Property not found");
    }

    // Normalize option IDs to ensure they use proper ObjectId format
    const normalizeOptions = (opts: PropertyOption[] | undefined): PropertyOption[] => {
      if (!opts) return [];
      return opts.map((opt) => {
        // Check if option ID is already in proper format (opt_ followed by ObjectId)
        if (opt.id && opt.id.startsWith("opt_") && opt.id.length > 4) {
          const idPart = opt.id.substring(4);
          // Validate if it's a valid ObjectId format (24 hex characters)
          if (/^[0-9a-fA-F]{24}$/.test(idPart)) {
            return opt; // Already has proper ID
          }
        }
        // Generate new proper ObjectId-based ID
        return {
          ...opt,
          id: `opt_${new ObjectId()}`,
        };
      });
    };

    const normalizedOptions = options !== undefined 
      ? normalizeOptions(options)
      : existingProperty.options 
        ? normalizeOptions(existingProperty.options)
        : [];

    const updatedProperty: PropertySchema = {
      ...existingProperty,
      name: newName.trim(),
      type: type,
      default: isDefault,
      showProperty: showProperty ?? existingProperty.showProperty ?? true,
      options: normalizedOptions,
    };

    // Only add number property settings if type is "number"
    if (type === "number") {
      updatedProperty.numberFormat = numberFormat !== undefined ? numberFormat : existingProperty.numberFormat;
      updatedProperty.decimalPlaces = decimalPlaces !== undefined ? decimalPlaces : existingProperty.decimalPlaces;
      updatedProperty.showAs = showAs !== undefined ? showAs : existingProperty.showAs;
      updatedProperty.progressColor = progressColor !== undefined ? progressColor : existingProperty.progressColor;
      updatedProperty.progressDivideBy = progressDivideBy !== undefined ? progressDivideBy : existingProperty.progressDivideBy;
      updatedProperty.showNumberText = showNumberText !== undefined ? showNumberText : existingProperty.showNumberText;
    } else {
      // Remove number settings if type is not "number"
      delete updatedProperty.numberFormat;
      delete updatedProperty.decimalPlaces;
      delete updatedProperty.showAs;
      delete updatedProperty.progressColor;
      delete updatedProperty.progressDivideBy;
      delete updatedProperty.showNumberText;
    }

    // Only add formula property settings if type is "formula"
    if (type === "formula") {
      updatedProperty.formula = formula !== undefined ? formula : existingProperty.formula;
      updatedProperty.formulaReturnType = formulaReturnType !== undefined ? formulaReturnType : existingProperty.formulaReturnType;
    } else {
      // Remove formula settings if type is not "formula"
      delete updatedProperty.formula;
      delete updatedProperty.formulaReturnType;
    }

    // Only add relation property settings if type is "relation"
    if (type === "relation") {
      updatedProperty.relationLimit = relationLimit !== undefined ? relationLimit : existingProperty.relationLimit;
    } else {
      // Remove relation settings if type is not "relation"
      delete updatedProperty.relationLimit;
    }

    // Only add rollup settings if type is "rollup"
    if (type === "rollup") {
      // Normalize calculation (might be old string format from database)
      const normalizeCalc = (calc: any): { category: "original" | "count" | "percent"; value: "original" | "all" | "per_group" | "empty" | "non_empty"; metadata?: any } => {
        if (!calc) return { category: "original", value: "original" };
        if (typeof calc === "object" && "category" in calc && "value" in calc) {
          return calc;
        }
        // Old string format - convert to object
        return { category: "original", value: "original" };
      };
      
      const normalizedRollupCalc = normalizeCalc(rollup?.calculation);
      const normalizedExistingCalc = normalizeCalc(existingProperty.rollup?.calculation);
      
      updatedProperty.rollup = {
        relationPropertyId: rollup?.relationPropertyId ?? existingProperty.rollup?.relationPropertyId,
        relationDataSourceId: rollup?.relationDataSourceId ?? existingProperty.rollup?.relationDataSourceId,
        targetPropertyId: rollup?.targetPropertyId ?? existingProperty.rollup?.targetPropertyId,
        calculation: rollup?.calculation ? normalizedRollupCalc : normalizedExistingCalc,
        selectedOptions: rollup?.selectedOptions ?? existingProperty.rollup?.selectedOptions,
      };
    } else {
      delete updatedProperty.rollup;
    }
    
    if (githubPrConfig !== undefined) {
      if (githubPrConfig === null) {
        delete updatedProperty.githubPrConfig;
      } else {
        updatedProperty.githubPrConfig = githubPrConfig;
      }
    }

    // Handle form metadata
    if (formMetaData !== undefined) {
      const nextCheckboxLabel =
        formMetaData.checkboxLabel !== undefined
          ? (formMetaData.checkboxLabel?.trim?.() ?? "")
          : existingProperty.formMetaData?.checkboxLabel;

      updatedProperty.formMetaData = {
        isFiedRequired: formMetaData.isFiedRequired ?? existingProperty.formMetaData?.isFiedRequired ?? false,
        isDescriptionRequired: formMetaData.isDescriptionRequired ?? existingProperty.formMetaData?.isDescriptionRequired ?? false,
        Description: formMetaData.Description ?? existingProperty.formMetaData?.Description ?? "",
        isLongAnswerRequired: formMetaData.isLongAnswerRequired ?? existingProperty.formMetaData?.isLongAnswerRequired ?? false,
      };

      // Always set checkboxLabel if it was provided, even if empty
      if (formMetaData.checkboxLabel !== undefined) {
        updatedProperty.formMetaData.checkboxLabel = nextCheckboxLabel || "";
      } else if (existingProperty.formMetaData?.checkboxLabel !== undefined) {
        // Preserve existing checkboxLabel if not provided
        updatedProperty.formMetaData.checkboxLabel = existingProperty.formMetaData.checkboxLabel;
      }
    } else {
      // Preserve existing formMetaData if not provided
      if (existingProperty.formMetaData) {
        updatedProperty.formMetaData = existingProperty.formMetaData;
      }
    }

    const updatedProperties = {
      ...sourceProperties,
      [propertyId]: updatedProperty,
    };

    // Update IDatabaseSource (not IVeiwDatabase)
    const updateResult = await databaseSourcesCollection.updateOne(
      { _id: new ObjectId(dataSourceId) },
      {
        $set: {
          properties: updatedProperties,
          updatedAt: new Date(),
        },
      },
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error("Failed to update property schema");
    }

    // Fetch the updated data source
    const updatedDataSource = await databaseSourcesCollection.findOne({
      _id: new ObjectId(dataSourceId),
    });
    if (!updatedDataSource) {
      throw new Error("Failed to retrieve updated data source");
    }
    
    // Log audit if view is available
    if (view) {
      await AuditService.log({
        action: "UPDATE",
        noteId: viewId!,
        userId: view.createdBy.userId.toString(),
        userEmail: view.createdBy.userEmail,
        userName: view.createdBy.userName,
        noteName: view.title,
        serviceType: "MONGODB",
        field: "property",
        oldValue: undefined,
        newValue: newName.trim(),
        workspaceId: view.workspaceId,
        organizationDomain: view.organizationDomain,
      });
    }
    
    return {
      dataSource: updatedDataSource,
      propertyId,
      newName: newName.trim(),
      updatedAt: new Date(),
    };
  },

  async getAllViews({ workspaceId }: { workspaceId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const viewCollections = db.collection<IVeiwDatabase>("viewDatabases");

    // Build query filter
    const query: any = {};

    if (workspaceId) {
      query.workspaceId = workspaceId;
    }

    // Exclude a specific view if provided (useful when creating relation property)
   
    // Get all matching views
    const views = await viewCollections
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 }) // Most recently updated first
      .toArray();

    // Format views for response (convert ObjectId to string)
    const formattedViews = views.map((view) => ({
      _id: String(view._id),
      id: String(view._id),
      title: view.title,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt,
      workspaceId: view.workspaceId,
      organizationDomain: view.organizationDomain,
      viewsType: view.viewsType,
      // Don't include full properties object - just metadata
    }));

    return formattedViews;
  },

  async getAllNotesOfView({ viewId }: { viewId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const viewCollections = db.collection<IVeiwDatabase>("viewDatabases");
    const noteCollection = db.collection<INote>("notes");

    // 1. Verify view exists
    const view = await viewCollections.findOne({
      _id: new ObjectId(viewId),
    });
    if (!view) {
      throw new Error("View not found");
    }

    // 2. Get all notes for this view
    const notes = await noteCollection
      .find({ databaseViewId: new ObjectId(viewId) })
      .sort({ updatedAt: -1, createdAt: -1 }) // Most recently updated first
      .toArray();

    // 3. Format notes for response (return minimal data for relation selection)
    const formattedNotes = notes.map((note) => ({
      _id: String(note._id),
      id: String(note._id),
      title: note.title,
      icon: note.icon || "",
      coverUrl: note.coverUrl || null,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      // Include databaseProperties for display purposes
      databaseProperties: note.databaseProperties || {},
    }));

    return formattedNotes;
  },
};
