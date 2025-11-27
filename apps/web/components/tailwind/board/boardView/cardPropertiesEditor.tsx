"use client";

import { useBoard } from "@/contexts/boardContext";
import { postWithAuth } from "@/lib/api-helpers";
import type { BoardProperty, ViewCollection } from "@/types/board";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PROPERTY_TYPES } from "../addPropertyDialog";
import { updatePropertyVisibility } from "@/services-frontend/boardServices/databaseSettingsService";
import { DropdownMenuHeader, DropdownMenuSearch, DropdownMenuDraggableItem, DropdownMenuSectionWithAction } from "@/components/tailwind/ui/dropdown-menu";

interface CardPropertiesEditorProps {
  readonly board: ViewCollection;
  readonly boardProperties: Record<string, BoardProperty>;
  readonly onClose: () => void;
}

export default function CardPropertiesEditor({ board, boardProperties, onClose }: CardPropertiesEditorProps) {
  const boardId = board._id;
  const [localProperties, setLocalProperties] = useState(boardProperties);
  const [search, setSearch] = useState("");
  const { updateBoard, propertyOrder, setPropertyOrder, currentView, boards, dataSources, updateDataSource, setDataSource, setPropertyVisibility, getPropertyVisibility } = useBoard();
  const ModalRef = useRef<HTMLDivElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedPropertyId, setDraggedPropertyId] = useState<string | null>(null);
  const [dragOverPropertyId, setDragOverPropertyId] = useState<string | null>(null);
  
  // Helper to get current viewTypeId
  const getCurrentViewTypeId = (): string | null => {
    const latestBoard = boards.find((b) => b._id === boardId) || board;
    const cv = currentView[boardId];
    if (!latestBoard || !cv) return null;
    
    let viewObj;
    if (cv.id) {
      const currentViewId = typeof cv.id === "string" ? cv.id : String(cv.id);
      viewObj = latestBoard.viewsType?.find((vt) => {
        const viewId = typeof vt.id === "string" ? vt.id : String(vt.id);
        return viewId === currentViewId;
      });
    } else if (cv.type) {
      viewObj = latestBoard.viewsType?.find((vt) => vt.viewType === cv.type);
    }
    
    return viewObj?.id ? (typeof viewObj.id === "string" ? viewObj.id : String(viewObj.id)) : null;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ModalRef.current && !ModalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const viewTypeId = getCurrentViewTypeId();
    if (!viewTypeId) {
      // If no viewTypeId, just sync localProperties with boardProperties
      setLocalProperties(boardProperties);
      return;
    }

    const visiblePropertyIds = getPropertyVisibility(boardId) || [];
    const allPropertyIds = Object.keys(boardProperties);
    
    // When visibility array is empty, it means "show all non-default properties"
    // When visibility array has values, it means "show only these properties"
    const shouldShowAll = visiblePropertyIds.length === 0;
    
    const updatedProps: Record<string, BoardProperty> = { ...boardProperties };
    allPropertyIds.forEach(propId => {
      const existingProp = updatedProps[propId];
      if (existingProp) {
        // Determine visibility based on the rule:
        // - If shouldShowAll (empty array), show all non-default properties
        // - If not shouldShowAll (has values), show only properties in the array
        const isVisible = shouldShowAll 
          ? !existingProp.default 
          : visiblePropertyIds.includes(propId);
        
        updatedProps[propId] = {
          ...existingProp,
          showProperty: isVisible,
        };
      }
    });
    
    setLocalProperties(updatedProps);
  }, [boardProperties, getPropertyVisibility, boardId, currentView, boards]);

  const getCurrentDataSourceId = (): string | undefined => {
    const latestBoard = boards.find((b) => b._id === boardId) || board;
    const cv = currentView[boardId];
    
    let viewObj;
    if (cv?.id) {
      // Prioritize ID match - if cv.id exists, ONLY match by ID
      viewObj = latestBoard.viewsType?.find((vt) => vt.id === cv.id);
    } else if (cv?.type) {
      // Only fallback to type if no ID is available
      viewObj = latestBoard.viewsType?.find((vt) => vt.viewType === cv.type);
    }
    
    return viewObj?.databaseSourceId;
  };

  const toggleProperty = async (propId: string) => {
    const current = localProperties[propId];
    if (!current) return;

    const viewTypeId = getCurrentViewTypeId();
    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }

    const currentVisibility = getPropertyVisibility(boardId) || [];
    const isCurrentlyVisible = currentVisibility.includes(propId);
    
    const newVisibility = isCurrentlyVisible
      ? currentVisibility.filter(id => id !== propId)
      : [...currentVisibility, propId];

    // Store previous state for rollback
    const previousProperties = localProperties;
    const previousVisibility = currentVisibility;
    const latestBoard = boards.find((b) => b._id === boardId) || board;
    const previousBoard = latestBoard;

    // Optimistic update: update context first
    const updatedProps: Record<string, BoardProperty> = {
      ...localProperties,
      [propId]: {
        ...current,
        showProperty: !isCurrentlyVisible,
      },
    };
    setLocalProperties(updatedProps);
    setPropertyVisibility(viewTypeId, newVisibility);
    const optimisticViewsType = latestBoard.viewsType.map((v) => {
      const vId = typeof v.id === "string" ? v.id : String(v.id);
      if (vId === viewTypeId) {
        return {
          ...v,
          settings: {
            ...v.settings,
            propertyVisibility: newVisibility.map((id) => ({ propertyId: id })),
          },
        };
      }
      return v;
    });
    updateBoard(boardId, { ...latestBoard, viewsType: optimisticViewsType });

    try {
      const res = await updatePropertyVisibility(viewTypeId, newVisibility);

      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(boardId, { ...latestBoard, viewsType: updatedViewsType });
        
        if (res.viewType.settings?.propertyVisibility && Array.isArray(res.viewType.settings.propertyVisibility)) {
          const extractedVisibility = res.viewType.settings.propertyVisibility.map((pv: any) => 
            typeof pv === 'string' ? pv : pv.propertyId
          );
          setPropertyVisibility(viewTypeId, extractedVisibility);
        }
      }

      toast.success("Property visibility updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update property visibility");
      // Rollback on error
      setLocalProperties(previousProperties);
      setPropertyVisibility(viewTypeId, previousVisibility);
      updateBoard(boardId, previousBoard);
    }
  };

  const handleHideAll = async () => {
    const viewTypeId = getCurrentViewTypeId();
    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }

    const currentVisibility = getPropertyVisibility(boardId) || [];
    const visibleIds = Object.keys(localProperties).filter(id => currentVisibility.includes(id));
    
    if (visibleIds.length === 0) return;

    const newVisibility: string[] = [];
    
    // Store previous state for rollback
    const prev = { ...localProperties };
    const previousVisibility = currentVisibility;
    const latestBoard = boards.find((b) => b._id === boardId) || board;
    const previousBoard = latestBoard;

    // Optimistic update: update context first
    const next: Record<string, BoardProperty> = { ...localProperties };
    for (const id of visibleIds) {
      const current = next[id];
      if (!current) continue;
      next[id] = {
        ...current,
        showProperty: false,
      };
    }
    setLocalProperties(next);
    setPropertyVisibility(viewTypeId, newVisibility);
    const optimisticViewsType = latestBoard.viewsType.map((v) => {
      const vId = typeof v.id === "string" ? v.id : String(v.id);
      if (vId === viewTypeId) {
        return {
          ...v,
          settings: {
            ...v.settings,
            propertyVisibility: [],
          },
        };
      }
      return v;
    });
    updateBoard(boardId, { ...latestBoard, viewsType: optimisticViewsType });

    try {
      // Update via settings API (not property schema)
      const res = await updatePropertyVisibility(viewTypeId, newVisibility);

      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(boardId, { ...latestBoard, viewsType: updatedViewsType });
        
        if (res.viewType.settings?.propertyVisibility && Array.isArray(res.viewType.settings.propertyVisibility)) {
          const extractedVisibility = res.viewType.settings.propertyVisibility.map((pv: any) => 
            typeof pv === 'string' ? pv : pv.propertyId
          );
          setPropertyVisibility(viewTypeId, extractedVisibility);
        }
      }

      toast.success("All properties hidden");
    } catch (e) {
      toast.error("Failed to hide all");
      // Rollback on error
      setLocalProperties(prev);
      setPropertyVisibility(viewTypeId, previousVisibility);
      updateBoard(boardId, previousBoard);
    }
  };

  const handleShowAll = async () => {
    const viewTypeId = getCurrentViewTypeId();
    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }

    const allPropertyIds = Object.keys(localProperties);
    
    // Store previous state for rollback
    const prev = { ...localProperties };
    const currentVisibility = getPropertyVisibility(boardId) || [];
    const previousVisibility = currentVisibility;
    const latestBoard = boards.find((b) => b._id === boardId) || board;
    const previousBoard = latestBoard;

    // Optimistic update: update context first
    const next: Record<string, BoardProperty> = { ...localProperties };
    for (const id of allPropertyIds) {
      const current = next[id];
      if (!current) continue;
      next[id] = {
        ...current,
        showProperty: true,
      };
    }
    setLocalProperties(next);
    setPropertyVisibility(viewTypeId, allPropertyIds);
    const optimisticViewsType = latestBoard.viewsType.map((v) => {
      const vId = typeof v.id === "string" ? v.id : String(v.id);
      if (vId === viewTypeId) {
        return {
          ...v,
          settings: {
            ...v.settings,
            propertyVisibility: allPropertyIds.map((id) => ({ propertyId: id })),
          },
        };
      }
      return v;
    });
    updateBoard(boardId, { ...latestBoard, viewsType: optimisticViewsType });

    try {
      const res = await updatePropertyVisibility(viewTypeId, allPropertyIds);

      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(boardId, { ...latestBoard, viewsType: updatedViewsType });
        
        if (res.viewType.settings?.propertyVisibility && Array.isArray(res.viewType.settings.propertyVisibility)) {
          const extractedVisibility = res.viewType.settings.propertyVisibility.map((pv: any) => 
            typeof pv === 'string' ? pv : pv.propertyId
          );
          setPropertyVisibility(viewTypeId, extractedVisibility);
        }
      }

      toast.success("All properties shown");
    } catch (e) {
      toast.error("Failed to show all");
      // Rollback on error
      setLocalProperties(prev);
      setPropertyVisibility(viewTypeId, previousVisibility);
      updateBoard(boardId, previousBoard);
    }
  };

  const getPropertyIcon = (type: string) => {
    const found = PROPERTY_TYPES.find((p) => p.type === type);
    return found?.icon || null;
  };

  const orderFromContext = propertyOrder[boardId];
  const allOrderedIds =
    Array.isArray(orderFromContext) && orderFromContext.length > 0
      ? [...orderFromContext]
      : Object.keys(localProperties);

  const matchesSearch = (prop: BoardProperty) => {
    if (!search.trim()) return true;
    return prop.name.toLowerCase().includes(search.toLowerCase());
  };

  // Get visibility from context for accurate filtering
  const viewTypeId = getCurrentViewTypeId();
  const visiblePropertyIds = viewTypeId ? (getPropertyVisibility(boardId) || []) : [];
  const shouldShowAll = visiblePropertyIds.length === 0;

  // Filter properties based on visibility rules:
  // - If shouldShowAll (empty visibility array), show all non-default properties
  // - If not shouldShowAll (has visibility values), show only properties in the visibility array
  const shownOrderedIds = allOrderedIds.filter((id) => {
    const prop = localProperties[id];
    if (!prop || !matchesSearch(prop)) return false;
    
    // Use the showProperty flag from localProperties which is synced with visibility
    // This ensures consistency with the useEffect that updates localProperties
    if (shouldShowAll) {
      // When showing all, exclude default properties
      return !prop.default;
    }
    // When visibility array has values, only show properties in that array
    return visiblePropertyIds.includes(id);
  });
  
  const hiddenOrderedIds = allOrderedIds.filter((id) => {
    const prop = localProperties[id];
    if (!prop || !matchesSearch(prop)) return false;
    
    // Inverse of shown logic
    if (shouldShowAll) {
      // When showing all, hide default properties
      return !!prop.default;
    }
    // When visibility array has values, hide properties not in that array
    return !visiblePropertyIds.includes(id);
  });

  const applyShownOrder = (newShownIds: string[]) => {
    const rebuilt: string[] = [];
    let shownIndex = 0;
    for (const id of allOrderedIds) {
      if (localProperties[id]?.showProperty) {
        const newId = newShownIds[shownIndex++];
        rebuilt.push(newId ?? id);
      } else {
        rebuilt.push(id);
      }
    }
    setPropertyOrder(boardId, rebuilt);
  };

  const handleDragStart = (propertyId: string, isShown: boolean, index: number) => {
    setDraggedPropertyId(propertyId);
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, propertyId: string) => {
    e.preventDefault();
    setDragOverPropertyId(propertyId);
  };

  const createDragHandlers = (propertyId: string, isShown: boolean, index: number) => ({
    onDragStart: (e: React.DragEvent) => {
      handleDragStart(propertyId, isShown, index);
      e.stopPropagation();
    },
    onDragOver: (e: React.DragEvent) => handleDragOver(e, propertyId),
    onDragLeave: handleDragLeave,
    onDrop: (e: React.DragEvent) => handleDrop(e, propertyId, isShown, index),
  });

  const handleDragLeave = () => {
    setDragOverPropertyId(null);
  };

  const handleDrop = (e: React.DragEvent, dropPropertyId: string, isShown: boolean, dropIndex: number) => {
    e.preventDefault();
    if (!draggedPropertyId || draggedPropertyId === dropPropertyId) {
      setDraggedPropertyId(null);
      setDragOverPropertyId(null);
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const draggedProp = localProperties[draggedPropertyId];
    const dropProp = localProperties[dropPropertyId];
    if (!draggedProp || !dropProp) return;

    // If dragging within the same section (shown or hidden)
    if (isShown) {
      const newShown = [...shownOrderedIds];
      const draggedIndexInShown = newShown.indexOf(draggedPropertyId);
      if (draggedIndexInShown !== -1) {
        newShown.splice(draggedIndexInShown, 1);
        const newDropIndex = newShown.indexOf(dropPropertyId);
        if (newDropIndex !== -1) {
          newShown.splice(newDropIndex, 0, draggedPropertyId);
        } else {
          newShown.push(draggedPropertyId);
        }
        applyShownOrder(newShown);
      }
    } else {
      // Reorder hidden properties
      const newHidden = [...hiddenOrderedIds];
      const draggedIndexInHidden = newHidden.indexOf(draggedPropertyId);
      if (draggedIndexInHidden !== -1) {
        newHidden.splice(draggedIndexInHidden, 1);
        const newDropIndex = newHidden.indexOf(dropPropertyId);
        if (newDropIndex !== -1) {
          newHidden.splice(newDropIndex, 0, draggedPropertyId);
        } else {
          newHidden.push(draggedPropertyId);
        }
        // Update the full order
        const allIds = [...allOrderedIds];
        const draggedIndexInAll = allIds.indexOf(draggedPropertyId);
        const dropIndexInAll = allIds.indexOf(dropPropertyId);
        if (draggedIndexInAll !== -1 && dropIndexInAll !== -1) {
          allIds.splice(draggedIndexInAll, 1);
          allIds.splice(dropIndexInAll, 0, draggedPropertyId);
          setPropertyOrder(boardId, allIds);
        }
      }
    }

    setDraggedPropertyId(null);
    setDragOverPropertyId(null);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      ref={ModalRef}
      className="flex flex-col min-w-[290px] max-w-[290px] h-full max-h-[80vh] pt-0 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0">
        <DropdownMenuHeader
          title="Properties"
          onBack={onClose}
          onClose={onClose}
          showBack={true}
          showClose={true}
        />

        {/* Search */}
        <div className="px-2 py-1">
          <DropdownMenuSearch
            placeholder="Search for a property…"
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-2">
          {/* Shown in board section */}
          <DropdownMenuSectionWithAction
            heading="Shown in board"
            actionLabel="Hide all"
            onActionClick={handleHideAll}
          >
            {shownOrderedIds.map((id, index) => {
              const prop = localProperties[id];
              if (!prop) return null;
              const Icon = getPropertyIcon(prop.type);
              const isDragOver = dragOverPropertyId === id;
              
              const dragHandlers = createDragHandlers(id, true, index);
              return (
                <DropdownMenuDraggableItem
                  key={id}
                  id={id}
                  label={prop.name.charAt(0).toUpperCase() + prop.name.slice(1)}
                  icon={Icon ? <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" /> : undefined}
                  isVisible={true}
                  onToggleVisibility={() => toggleProperty(id)}
                  {...dragHandlers}
                  isDragOver={isDragOver}
                />
              );
            })}
          </DropdownMenuSectionWithAction>

          {/* Hidden in board section */}
          <DropdownMenuSectionWithAction
            heading="Hidden in board"
            actionLabel="Show all"
            onActionClick={handleShowAll}
            className="mt-0"
          >
            {hiddenOrderedIds.map((id, index) => {
              const prop = localProperties[id];
              if (!prop) return null;
              const Icon = getPropertyIcon(prop.type);
              const isDragOver = dragOverPropertyId === id;
              
              const dragHandlers = createDragHandlers(id, false, index);
              return (
                <DropdownMenuDraggableItem
                  key={id}
                  id={id}
                  label={prop.name.charAt(0).toUpperCase() + prop.name.slice(1)}
                  icon={Icon ? <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" /> : undefined}
                  isVisible={false}
                  onToggleVisibility={() => toggleProperty(id)}
                  {...dragHandlers}
                  isDragOver={isDragOver}
                  className="-ml-1"
                />
              );
            })}
          </DropdownMenuSectionWithAction>
        </div>
      </div>
    </div>
  );
}
