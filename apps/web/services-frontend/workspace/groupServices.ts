import { postWithAuth, fetchWithAuth } from "@/lib/api-helpers";
import type { Members } from "@/types/workspace";
import type { WorkspaceGroup, Workspace } from "@/types/workspace";
import { deleteWithAuth } from "@/lib/api-helpers";

export interface CreateGroupParams {
  workspaceId: string;
  name: string;
  members?: Members[];
}

export interface UpdateGroupParams {
  workspaceId: string;
  groupId: string;
  name?: string;
  members?: Members[];
}

export interface DeleteGroupParams {
  workspaceId: string;
  groupId: string;
}

/**
 * Create a new group in a workspace
 */
export async function createGroup(params: CreateGroupParams): Promise<Workspace> {
  const response = await postWithAuth("/api/workSpace/settings/Group/createGroup",{
      workspaceId: params.workspaceId,
      name: params.name,
      members: params.members || [],
    }
  );

  if ("isError" in response) {
    throw new Error(response.message || "Failed to create group");
  }

  return response.workspace;
}

/**
 * Update an existing group
 */
export async function updateGroup(params: UpdateGroupParams): Promise<Workspace> {
  const response = await postWithAuth<{ message: string; group: Workspace; workspace?: Workspace }>("/api/workSpace/settings/Group/updateGroup",{
      workspaceId: params.workspaceId,
      groupId: params.groupId,
      name: params.name,
      members: params.members,
    }
  );

  if ("isError" in response) {
    throw new Error(response.message || "Failed to update group");
  }

  // API returns {message, workspace} where workspace is the updated workspace
  return (response as any).workspace || (response as any).group || response;
}

/**
 * Delete a group
 */
export async function deleteGroup(params: DeleteGroupParams) {
    console.log("Deleting group", params);
  const response = await deleteWithAuth("/api/workSpace/settings/Group/deleteGroup", {
    body: JSON.stringify({
      workspaceId: params.workspaceId,
      groupId: params.groupId,
    }),
  });

  if ("isError" in (response as any)) {
    throw new Error((response as any).message || "Failed to delete group");
  }

  return (response as any).workspace;
}

