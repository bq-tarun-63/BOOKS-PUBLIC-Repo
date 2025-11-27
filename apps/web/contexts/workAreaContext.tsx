"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { useWorkspaceContext } from "./workspaceContext";
import { getAllWorkAreas, createWorkArea, updateWorkArea, deleteWorkArea } from "@/services-frontend/workArea/workAreaServices";
import { WorkArea } from "@/types/workarea";

interface WorkAreaContextType {
  workAreas: WorkArea[];
  isLoading: boolean;
  refreshWorkAreas: (force?: boolean) => Promise<void>;
  createWorkspaceWorkArea: (name: string, description?: string, icon?: string, accessLevel?: "open" | "closed" | "private") => Promise<WorkArea | null>;
  updateWorkspaceWorkArea: (workAreaId: string, name?: string, description?: string, icon?: string, accessLevel?: "open" | "closed" | "private") => Promise<void>;
  deleteWorkspaceWorkArea: (workAreaId: string) => Promise<void>;
}

const WorkAreaContext = createContext<WorkAreaContextType | undefined>(undefined);

export function WorkAreaProvider({ children }: { children: ReactNode }) {
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentWorkspace } = useWorkspaceContext();
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const refreshWorkAreas = useCallback(async (force = false) => {
    if (!currentWorkspace?._id) {
      setWorkAreas([]);
      lastFetchedWorkspaceIdRef.current = null;
      return;
    }

    // Prevent duplicate fetches for the same workspace unless forced
    if (!force && (isFetchingRef.current || lastFetchedWorkspaceIdRef.current === currentWorkspace._id)) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const fetchedWorkAreas = await getAllWorkAreas(currentWorkspace._id);

      console.log("fetchedWorkAreas -------->", fetchedWorkAreas);
      // Normalize IDs - ensure both id and _id are present, and include icon/description
      const normalizedWorkAreas = fetchedWorkAreas.map((wa: any) => ({
        ...wa,
        id: wa.id || String(wa._id),
        _id: wa._id || wa.id || String(wa._id),
        icon: wa.icon || undefined,
        description: wa.description || undefined,
      }));
      setWorkAreas(normalizedWorkAreas);
      lastFetchedWorkspaceIdRef.current = currentWorkspace._id;
    } catch (error) {
      console.error("Error fetching work areas:", error);
      toast.error("Failed to fetch work areas");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [currentWorkspace?._id]);

  // Automatically fetch work areas when workspace becomes available
  // This handles the case where workspace loads after page reload
  useEffect(() => {
    if (currentWorkspace?._id && lastFetchedWorkspaceIdRef.current !== currentWorkspace._id) {
      refreshWorkAreas();
    } else if (!currentWorkspace?._id) {
      // Clear work areas when workspace is cleared
      setWorkAreas([]);
      lastFetchedWorkspaceIdRef.current = null;
    }
  }, [currentWorkspace?._id, refreshWorkAreas]);

  const createWorkspaceWorkArea = useCallback(async (
    name: string,
    description?: string,
    icon?: string,
    accessLevel: "open" | "closed" | "private" = "open"
  ): Promise<WorkArea | null> => {
    if (!currentWorkspace?._id) {
      toast.error("No workspace selected");
      return null;
    }

    try {
      const response = await createWorkArea({
        workspaceId: currentWorkspace._id,
        name,
        description,
        icon,
        accessLevel,
      });

      // Normalize ID and convert ObjectId fields to strings
      const normalizedWorkArea: WorkArea = {
        _id: String(response._id || response.id || ""),
        name: response.name,
        workspaceId: String(response.workspaceId || ""),
        orgDomain: response.orgDomain,
        accessLevel: (response.accessLevel === "default" ? "open" : response.accessLevel) || "open",
        ownerId: String(response.ownerId || ""),
        createdBy: String(response.createdBy || ""),
        createdAt: response.createdAt ? (typeof response.createdAt === 'string' ? response.createdAt : new Date(response.createdAt).toISOString()) : new Date().toISOString(),
        updatedAt: response.updatedAt ? (typeof response.updatedAt === 'string' ? response.updatedAt : new Date(response.updatedAt).toISOString()) : new Date().toISOString(),
        icon: response.icon || undefined,
        description: response.description || undefined,
        members: (response.members || []).map((m: any) => ({
          ...m,
          userId: String(m.userId || ""),
        })),
        groupAccess: (response.groupAccess || []).map((ga: any) => ({
          ...ga,
          groupId: String(ga.groupId || ""),
          grantedBy: String(ga.grantedBy || ""),
          grantedAt: ga.grantedAt instanceof Date ? ga.grantedAt : new Date(ga.grantedAt || Date.now()),
        })),
        requests: (response.requests || []).map((r: any) => ({
          ...r,
          userId: String(r.userId || ""),
          reviewedBy: r.reviewedBy ? String(r.reviewedBy) : undefined,
          createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt || Date.now()),
          reviewedAt: r.reviewedAt ? (r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt)) : undefined,
        })),
      };

      // Add to list
      setWorkAreas((prev) => [...prev, normalizedWorkArea]);
      toast.success("Work area created successfully");
      return normalizedWorkArea;
    } catch (error) {
      console.error("Error creating work area:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create work area");
      return null;
    }
  }, [currentWorkspace?._id]);

  const updateWorkspaceWorkArea = useCallback(async (
    workAreaId: string,
    name?: string,
    description?: string,
    icon?: string,
    accessLevel?: "open" | "closed" | "private"
  ): Promise<void> => {
    if (!currentWorkspace?._id) {
      toast.error("No workspace selected");
      return;
    }

    try {
      const response = await updateWorkArea({
        workAreaId,
        workspaceId: currentWorkspace._id,
        name,
        description,
        icon,
        accessLevel,
      });

      // Normalize ID and convert ObjectId fields to strings
      const normalizedWorkArea: WorkArea = {
        _id: String(response._id || response.id || ""),
        name: response.name,
        workspaceId: String(response.workspaceId || ""),
        orgDomain: response.orgDomain,
        accessLevel: (response.accessLevel === "default" ? "open" : response.accessLevel) || "open",
        ownerId: String(response.ownerId || ""),
        createdBy: String(response.createdBy || ""),
        createdAt: response.createdAt ? (typeof response.createdAt === 'string' ? response.createdAt : new Date(response.createdAt).toISOString()) : new Date().toISOString(),
        updatedAt: response.updatedAt ? (typeof response.updatedAt === 'string' ? response.updatedAt : new Date(response.updatedAt).toISOString()) : new Date().toISOString(),
        icon: response.icon || undefined,
        description: response.description || undefined,
        members: (response.members || []).map((m: any) => ({
          ...m,
          userId: String(m.userId || ""),
        })),
        groupAccess: (response.groupAccess || []).map((ga: any) => ({
          ...ga,
          groupId: String(ga.groupId || ""),
          grantedBy: String(ga.grantedBy || ""),
          grantedAt: ga.grantedAt instanceof Date ? ga.grantedAt : new Date(ga.grantedAt || Date.now()),
        })),
        requests: (response.requests || []).map((r: any) => ({
          ...r,
          userId: String(r.userId || ""),
          reviewedBy: r.reviewedBy ? String(r.reviewedBy) : undefined,
          createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt || Date.now()),
          reviewedAt: r.reviewedAt ? (r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt)) : undefined,
        })),
      };

      // Update in list
      setWorkAreas((prev) =>
        prev.map((wa) => (wa._id === workAreaId || String(wa._id) === workAreaId ? normalizedWorkArea : wa))
      );
      toast.success("Work area updated successfully");
    } catch (error) {
      console.error("Error updating work area:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update work area");
    }
  }, [currentWorkspace?._id]);

  const deleteWorkspaceWorkArea = useCallback(async (workAreaId: string): Promise<void> => {
    if (!currentWorkspace?._id) {
      toast.error("No workspace selected");
      return;
    }

    try {
      await deleteWorkArea({
        workAreaId,
        workspaceId: currentWorkspace._id,
      });

      // Remove from list
      setWorkAreas((prev) => prev.filter((wa) => wa._id !== workAreaId && String(wa._id) !== workAreaId));
      toast.success("Work area deleted successfully");
    } catch (error) {
      console.error("Error deleting work area:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete work area");
    }
  }, [currentWorkspace?._id]);

  return (
    <WorkAreaContext.Provider
      value={{
        workAreas,
        isLoading,
        refreshWorkAreas,
        createWorkspaceWorkArea,
        updateWorkspaceWorkArea,
        deleteWorkspaceWorkArea,
      }}
    >
      {children}
    </WorkAreaContext.Provider>
  );
}

export function useWorkAreaContext() {
  const context = useContext(WorkAreaContext);
  if (context === undefined) {
    throw new Error("useWorkAreaContext must be used within a WorkAreaProvider");
  }
  return context;
}

