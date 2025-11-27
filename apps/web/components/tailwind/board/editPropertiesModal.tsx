"use client";

import { useBoard } from "@/contexts/boardContext";
import type { BoardProperty, ViewCollection } from "@/types/board";
import { useEffect, useRef, useState } from "react";
import { PROPERTY_TYPES } from "./addPropertyDialog";
import { AddPropertyDialog } from "./addPropertyDialog";
import { postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";
import { updatePropertyVisibility } from "@/services-frontend/boardServices/databaseSettingsService";
import { DropdownMenuHeader, DropdownMenuSearch, DropdownMenuDraggableItem } from "@/components/tailwind/ui/dropdown-menu";

interface EditPropertiesModalProps {
  readonly board: ViewCollection;
  readonly boardProperties: Record<string, BoardProperty>;
  readonly onClose: () => void;
  readonly onPropertyClick?: (propertyId: string) => void;
  readonly onAddProperty?: () => void;
}

export default function EditPropertiesModal({ board, boardProperties, onClose, onPropertyClick, onAddProperty }: EditPropertiesModalProps) {
  const { propertyOrder, setPropertyOrder, getCurrentDataSource, setDataSource, currentView, boards: contextBoards, setPropertyVisibility, getPropertyVisibility } = useBoard();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showAddPropertyDialog, setShowAddPropertyDialog] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const propertyItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const addPropertyDialogRef = useRef<HTMLDivElement>(null);
  const addPropertyButtonRef = useRef<HTMLButtonElement>(null);
  const [propertyDialogPosition, setPropertyDialogPosition] = useState({ top: 0, left: 0 });

  // Helper to get current dataSourceId from current view
  const getCurrentDataSourceId = (): string | null => {
    const currentViewData = currentView[board._id];
    const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
    
    let view;
    if (currentViewData?.id) {
      view = latestBoard.viewsType?.find((vt) => vt.id === currentViewData.id);
    } else if (currentViewData?.type) {
      view = latestBoard.viewsType?.find((vt) => vt.viewType === currentViewData.type);
    }
    
    const dsId = view?.databaseSourceId;
    return dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Don't close if we're in the AddPropertyDialog view
      if (showAddPropertyDialog) return;
      
      // Check if click is outside the modal
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    // Only add listener when not in AddPropertyDialog view
    if (!showAddPropertyDialog) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [onClose, showAddPropertyDialog]);

  const getPropertyIcon = (type: string) => {
    const propType = PROPERTY_TYPES.find((p) => p.type === type);
    return propType ? propType.icon : null;
  };

  const handlePropertyClick = (propId: string) => {
    if (onPropertyClick) {
      onPropertyClick(propId);
    }
  };

  // Get property order from context or fallback to object keys
  const boardPropertyOrder = propertyOrder[board._id];
  const currentOrder = (boardPropertyOrder && boardPropertyOrder.length > 0
    ? boardPropertyOrder
    : Object.keys(boardProperties));

  // Filter properties based on search query
  const filteredOrder = currentOrder.filter((id) => {
    const prop = boardProperties[id];
    if (!prop) return false;
    const propName = prop.name.toLowerCase();
    return propName.includes(searchQuery.toLowerCase());
  });

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);


  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && propertyItemRefs.current[selectedIndex]) {
      propertyItemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";

    // Prevent dragging the full element snapshot
    const img = new Image();
    img.src = "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newOrder = [...currentOrder];
    const [movedItem] = newOrder.splice(draggedIndex, 1);

    if (movedItem) {
      newOrder.splice(dropIndex, 0, movedItem);
    }

    setDraggedIndex(null);

    // Persist updated order in context
    setPropertyOrder(board._id, newOrder);
  };

  // Handle keyboard navigation for menu container
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredOrder.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredOrder.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredOrder.length) {
        const propId = filteredOrder[selectedIndex];
        if (propId) {
          handlePropertyClick(propId);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Handle keyboard navigation for search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(0);
      // Focus the menu container
      const menuElement = modalRef.current?.querySelector('[role="menu"]') as HTMLElement;
      menuElement?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleAddPropertyClick = () => {
    if (onAddProperty) {
      onAddProperty();
    } else {
      // Calculate position relative to button
      if (addPropertyButtonRef.current) {
        const rect = addPropertyButtonRef.current.getBoundingClientRect();
        setPropertyDialogPosition({ 
          top: rect.bottom + 4, 
          left: rect.left 
        });
      }
      setShowAddPropertyDialog(true);
    }
  };

  const insertPropertyIntoOrder = (newPropertyId: string) => {
    const boardPropertyOrder = propertyOrder[board._id];
    const currentOrder = (boardPropertyOrder && boardPropertyOrder.length > 0
      ? boardPropertyOrder
      : Object.keys(boardProperties));
    
    // Add new property to the end of the order
    const newOrder = [...currentOrder, newPropertyId];
    setPropertyOrder(board._id, newOrder);
  };

  const handlePropertyAdd = async (type: string, options?: any) => {
    try {
      // Get dataSourceId from current view
      const dataSourceId = getCurrentDataSourceId();
      if (!dataSourceId) {
        toast.error("Data source not found for current view!");
        return null;
      }

      // Get current data source to compare keys before adding
      const currentDataSource = getCurrentDataSource(board._id);
      const prevKeys = Object.keys(currentDataSource?.properties || boardProperties || {});

      // Call API directly to create property
      const res = await postWithAuth(`/api/database/createProperty`, {
        dataSourceId: dataSourceId,
        viewId: board._id, // Optional for audit
        name: type,
        type,
        options: options || [],
      });

      if (!res.success) {
        toast.error("Failed to add property!");
        return null;
      }

      // Update data source in context from API response
      if (res.dataSource) {
        const ds = res.dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : dataSourceId;
        setDataSource(dsId, ds as any);
      }

      // Find the newly added property ID
      const updatedDataSource = res.dataSource || currentDataSource;
      const resKeys = Object.keys(updatedDataSource?.properties || {});
      const newlyAddedKeys = resKeys.filter((k) => !prevKeys.includes(k));
      const createdId = newlyAddedKeys[0] || res.property?.id || res.property?.name;

      if (createdId) {
        insertPropertyIntoOrder(createdId);
        
        // Add the new property to property visibility for the current view
        const getCurrentViewTypeId = (): string | null => {
          const currentViewData = currentView[board._id];
          const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
          if (!latestBoard || !currentViewData) return null;
          
          let viewObj;
          if (currentViewData.id) {
            const currentViewId = typeof currentViewData.id === "string" ? currentViewData.id : String(currentViewData.id);
            viewObj = latestBoard.viewsType?.find((vt) => {
              const viewId = typeof vt.id === "string" ? vt.id : String(vt.id);
              return viewId === currentViewId;
            });
          } else if (currentViewData.type) {
            viewObj = latestBoard.viewsType?.find((vt) => vt.viewType === currentViewData.type);
          }
          
          return viewObj?.id ? (typeof viewObj.id === "string" ? viewObj.id : String(viewObj.id)) : null;
        };
        
        const viewTypeId = getCurrentViewTypeId();
        if (viewTypeId) {
          const currentVisibility = getPropertyVisibility(board._id) || [];
          // Only add if not already in visibility list
          if (!currentVisibility.includes(createdId)) {
            const newVisibility = [...currentVisibility, createdId];
            setPropertyVisibility(viewTypeId, newVisibility);
            
            // Update on backend
            try {
              await updatePropertyVisibility(viewTypeId, newVisibility);
            } catch (err) {
              console.error("Failed to update property visibility:", err);
              // Rollback on error
              setPropertyVisibility(viewTypeId, currentVisibility);
            }
          }
        }
        
        toast.success(`Property "${res.property?.name || type}" added successfully!`);
      } else {
        toast.success("Property added successfully!");
      }

      // Don't close the dialog here - let the caller handle navigation
      return createdId ? { id: createdId, name: res.property?.name || type } : null;
    } catch (error) {
      console.error("Error adding property:", error);
      toast.error("Failed to add property!");
      return null;
    }
  };

  // Show AddPropertyDialog when showAddPropertyDialog is true
  if (showAddPropertyDialog) {
    return (
      <div
        ref={modalRef}
        data-modal-container
        className="flex flex-col min-w-[290px] max-w-[290px] max-h-[80vh] rounded-lg border bg-background overflow-hidden border-gray-200 shadow-xl dark:border-[#3c3c3c]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0">
          <DropdownMenuHeader
            title="Add property"
            onBack={() => setShowAddPropertyDialog(false)}
            onClose={() => setShowAddPropertyDialog(false)}
            showBack={true}
            showClose={true}
          />
        </div>

        {/* Add Property Dialog */}
        <div 
          className="flex-1 overflow-y-auto p-2 relative"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <AddPropertyDialog
              onSelect={async (type: string, options?: any) => {
                const result = await handlePropertyAdd(type, options);
                // Don't close the modal, just go back to properties list
                setShowAddPropertyDialog(false);
                return result;
              }}
              onClose={() => {
                // Only go back to properties list, don't close the whole modal
                setShowAddPropertyDialog(false);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Normal EditPropertiesModal content
  return (
    <div
      ref={modalRef}
      className="flex flex-col min-w-[290px] max-w-[290px] max-h-[80vh] rounded-lg border bg-background dark:border-gray-700 shadow-sm overflow-hidden"
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
      </div>

      {/* Search input */}
      <div className="px-2 py-1">
        <DropdownMenuSearch
          placeholder="Search for a property…"
          value={searchQuery}
          onChange={setSearchQuery}
          onKeyDown={handleSearchKeyDown}
          autoFocus={true}
        />
      </div>

      {/* Property list */}
      <div 
        className="flex-1 overflow-y-auto p-2 focus:outline-none focus-visible:outline-none focus-visible:ring-0" 
        role="menu" 
        tabIndex={0} 
        onKeyDown={handleMenuKeyDown}
      >
        <div className="flex flex-col gap-1">
          {filteredOrder.map((id, index) => {
            const prop = boardProperties[id];
            if (!prop) return null;
            const Icon = getPropertyIcon(prop.type);
            const originalIndex = currentOrder.indexOf(id);
            const isDragging = draggedIndex === originalIndex;
            const isSelected = selectedIndex === index;

            return (
              <DropdownMenuDraggableItem
                key={id}
                id={id}
                label={prop.name.charAt(0).toUpperCase() + prop.name.slice(1)}
                icon={Icon ? <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" /> : undefined}
                rightElement="chevron"
                onDragStart={(e) => handleDragStart(e, originalIndex)}
                onDragOver={handleDragOver}
                onDragLeave={() => {}}
                onDrop={(e) => {
                  const dropOriginalIndex = currentOrder.indexOf(id);
                  handleDrop(e, dropOriginalIndex);
                }}
                onClick={() => handlePropertyClick(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handlePropertyClick(id);
                  }
                }}
                isDragging={isDragging}
                isSelected={isSelected}
                aria-label={`Edit ${prop.name}`}
                aria-selected={isSelected}
                tabIndex={-1}
              />
            );
          })}
        </div>
      </div>

      {/* Footer */}
      {/* <footer className="flex-shrink-0">
        <div className="p-2 pt-0 flex flex-col gap-1">
          <button
            ref={addPropertyButtonRef}
            onClick={handleAddPropertyClick}
            className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm text-gray-500 dark:text-gray-400 focus:outline-none"
            type="button"
            role="menuitem"
            tabIndex={0}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">New property</span>
          </button>
        </div>
      </footer> */}
    </div>
  );
}
