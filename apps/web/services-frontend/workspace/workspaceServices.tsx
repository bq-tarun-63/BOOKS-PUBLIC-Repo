import { getWithAuth, postWithAuth } from "@/lib/api-helpers";
import { WorkspaceResponse } from "@/types/workspace";


export async function fetchWorkspaces() {
    try {
      const data = await getWithAuth<WorkspaceResponse>("/api/workSpace/getAll");
  
      if ("workspaces" in data) {
        return data.workspaces ?? [];
      } else {
        console.error("API Error:", data.message);
        return [];
      }
    } catch (err) {
      console.error("Error fetching workspaces:", err);
      return [];
    }
}