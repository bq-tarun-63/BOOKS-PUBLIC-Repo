"use client";

import { useBoard } from "@/contexts/boardContext";
import type { ViewCollection } from "@/types/board";
import { ArrowLeft, Calendar, Clock, LayoutGrid, List, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";

interface LayoutSettingsModalProps {
  readonly board: ViewCollection;
  readonly onClose: () => void;
}

export default function LayoutSettingsModal({ board, onClose }: LayoutSettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { currentView, setCurrentView, updateBoard } = useBoard();
  const currentViewData = currentView[board._id];
  const boardView = currentViewData?.type || board.viewsType?.[0]?.viewType || "board";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const allViews: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<any>;
  }> = [
    { id: "board", label: "Board", icon: LayoutGrid },
    { id: "list", label: "List", icon: List },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "timeline", label: "Timeline", icon: Clock },
  ];

  const handleViewClick = async (newViewType: string) => {
    if (newViewType !== "board" && newViewType !== "list" && newViewType !== "calendar" && newViewType !== "timeline") {
      return;
    }

    // Don't update if already the same type
    if (boardView === newViewType) {
      onClose();
      return;
    }

    // Find current view by ID first, then by type
    let currentViewObj;
    if (currentViewData?.id) {
      currentViewObj = board.viewsType?.find((v) => v.id === currentViewData.id);
    } else if (currentViewData?.type) {
      currentViewObj = board.viewsType?.find((v) => v.viewType === currentViewData.type);
    } else {
      currentViewObj = board.viewsType?.[0];
    }

    if (!currentViewObj || !currentViewObj.id) {
      toast.error("Current view not found or missing ID");
      onClose();
      return;
    }

    // Optimistic update - change current view's type
    const updatedViewsType = board.viewsType.map((view) =>
      view.id === currentViewObj.id
        ? { ...view, viewType: newViewType as "board" | "list" | "calendar" | "timeline" }
        : view
    );
    const updatedBoard: ViewCollection = {
      ...board,
      viewsType: updatedViewsType,
    };
    updateBoard(board._id, updatedBoard);
    setCurrentView(board._id, currentViewObj.id, newViewType);

    try {
      const res = await postWithAuth(`/api/database/updateViewType`, {
        viewId: board._id,
        viewTypeId: currentViewObj.id,
        title: currentViewObj.title || newViewType.charAt(0).toUpperCase() + newViewType.slice(1),
        icon: currentViewObj.icon || "",
        viewType: newViewType,
      });

      if (!res.view?.success) {
        toast.error("Failed to update view type");
        // Rollback on failure
        updateBoard(board._id, board);
        setCurrentView(board._id, currentViewObj.id, currentViewObj.viewType);
        return;
      }

      // Update viewsType from API response if available
      if (res.view.view?.viewsType) {
        const updatedViewsTypeFromResponse = (res.view.view.viewsType || []).map((vt: any) => {
          const id = vt._id 
            ? (typeof vt._id === "string" ? vt._id : vt._id.toString())
            : vt.id || "";
          
          const databaseSourceId = vt.databaseSourceId
            ? (typeof vt.databaseSourceId === "string" ? vt.databaseSourceId : vt.databaseSourceId.toString())
            : undefined;
          
          return {
            id: id,
            viewType: vt.viewType,
            title: vt.title || "",
            icon: vt.icon || "",
            formIcon: vt.formIcon || "",
            formCoverImage: vt.formCoverImage || null,
            formTitle: vt.formTitle || "",
            formDescription: vt.formDescription || "",
            databaseSourceId: databaseSourceId,
          };
        });
        
        const finalUpdatedBoard: ViewCollection = {
          ...board,
          viewsType: updatedViewsTypeFromResponse,
        };
        updateBoard(board._id, finalUpdatedBoard);
        
        // Find the updated view and set it as current
        const updatedView = updatedViewsTypeFromResponse.find((v) => v.id === currentViewObj.id);
        if (updatedView && updatedView.id) {
          const viewId = typeof updatedView.id === "string" ? updatedView.id : String(updatedView.id);
          setCurrentView(board._id, viewId, updatedView.viewType);
        }
      } else {
        // Fallback: update from optimistic update
        if (currentViewObj.id) {
          const viewId = typeof currentViewObj.id === "string" ? currentViewObj.id : String(currentViewObj.id);
          setCurrentView(board._id, viewId, newViewType);
        }
      }

      toast.success("View type updated successfully");
    } catch (err) {
      console.error("Failed to update view type", err);
      toast.error("Failed to update view type");
      // Rollback on error
      updateBoard(board._id, board);
      setCurrentView(board._id, currentViewObj.id, currentViewObj.viewType);
    }
    
    onClose();
  };


  return (
    <div
      ref={modalRef}
      className="flex flex-col w-[300px] rounded-lg border bg-background dark:border-gray-700 shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0"
        draggable={false}
        onDragStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-center h-[42px]" style={{ padding: "14px 16px 6px" }}>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-75 flex-shrink-0"
            style={{ 
              height: "22px",
              width: "24px",
              padding: "0px",
              marginInline: "-2px 8px"
            }}
            type="button"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="flex-1 font-semibold text-sm text-gray-900 dark:text-gray-100 truncate" style={{ fontWeight: 600, fontSize: "14px" }}>
            Layout
          </span>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-75 flex-shrink-0"
            style={{
              height: "20px",
              width: "20px",
              padding: "0px"
            }}
            type="button"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Grid of views */}
      <div className="p-2">
        <div className="grid grid-cols-3 gap-2">
          {allViews.map((view) => {
            const Icon = view.icon;
            const isSelected = boardView === view.id;

            return (
              <button
                key={view.id}
                type="button"
                onClick={() => handleViewClick(view.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all select-none
                  ${isSelected 
                    ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 text-blue-600 dark:text-blue-400" 
                    : "border border-gray-200 text-muted-foreground dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 "
                  }
                  cursor-pointer
                `}
                aria-label={`Change to ${view.label} view`}
              >
                <Icon className="w-5 h-5 mb-2" aria-hidden={true} />
                <span className="text-xs font-medium text-center">{view.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
