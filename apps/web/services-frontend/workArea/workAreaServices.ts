import { postWithAuth, getWithAuth, deleteWithAuth } from "@/lib/api-helpers";
import { WorkArea } from "@/models/types/WorkArea";

export interface WorkAreaResponse {
  workAreas?: WorkArea[];
  workArea?: WorkArea;
}

export interface CreateWorkAreaParams {
  workspaceId: string;
  name: string;
  description?: string;
  icon?: string;
  accessLevel?: "open" | "closed" | "private";
}

export interface UpdateWorkAreaParams {
  workAreaId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  icon?: string;
  accessLevel?: "open" | "closed" | "private";
}

export interface DeleteWorkAreaParams {
  workAreaId: string;
  workspaceId: string;
}

/**
 * Get all work areas for a workspace
 */
export async function getAllWorkAreas(workspaceId: string) {
  const response = await getWithAuth<WorkAreaResponse>(`/api/workarea/getAll/${workspaceId}`);

  console.log("response for workArea services -------->", response);

  if ("isError" in response) {
    throw new Error(response.message || "Failed to fetch work areas");
  }

  return response.workAreas || [];
}

/**
 * Create a new work area
 */
export async function createWorkArea(params: CreateWorkAreaParams): Promise<WorkArea> {
  const response = await postWithAuth("/api/workarea/create", {
    workspaceId: params.workspaceId,
    name: params.name,
    description: params.description,
    icon: params.icon,
    accessLevel: params.accessLevel || "open",
  });

  if ("isError" in response) {
    throw new Error(response.message || "Failed to create work area");
  }

  return response;
}

/**
 * Update an existing work area
 */
export async function updateWorkArea(params: UpdateWorkAreaParams): Promise<WorkArea> {
  // Build payload with only defined values
  const payload: Record<string, any> = {
    workAreaId: params.workAreaId,
    workspaceId: params.workspaceId,
  };

  // Only include fields that are defined (not undefined)
  if (params.name !== undefined) {
    payload.name = params.name;
  }
  if (params.description !== undefined) {
    payload.description = params.description;
  }
  if (params.icon !== undefined) {
    payload.icon = params.icon;
  }
  if (params.accessLevel !== undefined) {
    payload.accessLevel = params.accessLevel;
  }

  console.log("Update work area payload:", payload);

  const response = await postWithAuth("/api/workarea/update", payload);

  if ("isError" in response) {
    throw new Error(response.message || "Failed to update work area");
  }

  // Handle response structure: API returns { workArea: ... }
  if (response && typeof response === "object" && "workArea" in response) {
    return (response as { workArea: WorkArea }).workArea;
  }

  // Fallback to direct response (for backward compatibility)
  return response as WorkArea;
}

/**
 * Delete a work area
 */
export async function deleteWorkArea(params: DeleteWorkAreaParams): Promise<void> {
  const response = await deleteWithAuth<{ message?: string }>("/api/workarea/delete", {
    body: JSON.stringify({
      workAreaId: params.workAreaId,
      workspaceId: params.workspaceId,
    }),
  });

  if ("isError" in response) {
    const errorResponse = response as { isError: boolean; message?: string };
    throw new Error(errorResponse.message || "Failed to delete work area");
  }
}

