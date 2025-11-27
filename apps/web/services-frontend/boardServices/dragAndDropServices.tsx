"use client";

import { postWithAuth } from "@/lib/api-helpers";
import { BoardPropertyOption, ViewCollection } from "@/types/board";
import { toast } from "sonner";
import { useBoard } from "@/contexts/boardContext";

/**
 * Reorder status property options (used in drag and drop column reordering)
 */
export const handleReorderPropertyOptions = async (
  board: ViewCollection,
  propertyId: string,
  newName: string,
  newOptions: BoardPropertyOption[],
  getCurrentDataSourceId?: () => string | null
) => {
  try {
    const property = board.properties[propertyId];
    if (!property) {
      console.error("Property not found:", propertyId);
      return;
    }

    // Get dataSourceId from current view ID (not type)
    let dataSourceId: string | null = null;
    if (getCurrentDataSourceId) {
      dataSourceId = getCurrentDataSourceId();
    } else {
      // Fallback: try to get from board context if available
      const { useBoard } = await import("@/contexts/boardContext");
      const { currentView, boards: contextBoards } = useBoard();
      const currentViewData = currentView[board._id];
      const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
      const view = latestBoard.viewsType?.find((vt) => 
        (currentViewData?.id && vt.id === currentViewData.id) || 
        (!currentViewData?.id && vt.viewType === currentViewData?.type)
      );
      const dsId = view?.databaseSourceId;
      dataSourceId = dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
    }

    if (!dataSourceId) {
      toast.error("Data source not found for current view!");
      return null;
    }

    console.log("Reordering property options:", {
      propertyId,
      newName,
      newOptions,
      dataSourceId,
    });

    const res = await postWithAuth(`/api/database/updatePropertySchema`, {
      dataSourceId: dataSourceId,
      viewId: board._id, // Optional for audit
      propertyId,
      newName,
      type: property.type,
      options: newOptions,
    });

    if (!res.success) {
      toast.error("Failed to reorder property options!");
      return null;
    }

    toast.success("Property options reordered successfully!");
    // Return both properties and dataSource for the caller to update context
    return {
      properties: res.view?.properties || board.properties,
      dataSource: res.dataSource,
    };
  } catch (err) {
    console.error("Error reordering property options:", err);
    toast.error("Could not reorder property options!");
    return null;
  }
};
