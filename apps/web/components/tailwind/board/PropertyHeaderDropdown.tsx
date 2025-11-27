"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Calendar,
  CheckSquare,
  Calculator,
  Flag,
  Type,
  User,
  Hash,
  List,
  ListChecks,
  Lock,
  X,
  Tag,
  Monitor,
  ChevronRight,
  Trash2,
} from "lucide-react";
import type { BoardProperty, ViewCollection } from "@/types/board";
import EditSinglePropertyModal from "./editSinglePropertyModal";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { Check } from "lucide-react";
import DeleteConfirmationModal from "../ui/deleteConfirmationModal";
import { toast } from "sonner";
import { useBoard } from "@/contexts/boardContext";
import { DropdownMenu, DropdownMenuDivider, DropdownMenuIcons } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

interface PropertyHeaderDropdownProps {
  property: {
    id: string;
    name: string;
    type: string;
  };
  board: ViewCollection;
  boardProperty?: BoardProperty;
  onClose: () => void;
  onSort?: (direction: 'ascending' | 'descending') => void;
  onFilter?: () => void;
  onGroup?: () => void;
  onHide?: () => void;
  onEdit?: () => void;
  onWrapInView?: () => void;
  onDisplayAs?: () => void;
  onInsertLeft?: () => void;
  onInsertRight?: () => void;
  onRemoveSort?: () => void;
  hasFilters?: boolean;
  hasSorts?: boolean;
  isGrouped?: boolean;
  filters: Record<string, string[]>;
  sortBy: Array<{ propertyId: string; direction: 'ascending' | 'descending' }>;
  onApplyFilters: (filters: Record<string, string[]>) => void;
  onApplySort: (sorts: Array<{ propertyId: string; direction: 'ascending' | 'descending' }>) => void;
}

export default function PropertyHeaderDropdown({
  property,
  board,
  boardProperty,
  onClose,
  onSort,
  onFilter,
  onGroup,
  onHide,
  onEdit,
  onWrapInView,
  onDisplayAs,
  onInsertLeft,
  onInsertRight,
  onRemoveSort,
  hasFilters,
  hasSorts,
  isGrouped,
  filters,
  sortBy,
  onApplyFilters,
  onApplySort,
}: PropertyHeaderDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterView, setShowFilterView] = useState(false);
  const [showSortView, setShowSortView] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { workspaceMembers } = useWorkspaceContext();
  const { updateBoard, updateAllNotes, getNotesByDataSourceId, propertyOrder, setPropertyOrder, getCurrentDataSourceProperties, currentView, boards, dataSources, updateDataSource, setDataSource } = useBoard();
  
  // Get properties from current data source
  const boardProperties = getCurrentDataSourceProperties(board._id) || board.properties;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showEditModal || showFilterView || showSortView) {
          setShowEditModal(false);
          setShowFilterView(false);
          setShowSortView(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, showEditModal, showFilterView, showSortView]);

  const handleAction = (action?: () => void) => {
    if (action) {
      action();
    }
    onClose();
  };

  // Handle delete property
  const handleDeleteProperty = async () => {
    if (!boardProperty) return;
    
    try {
      // Get dataSourceId from current view
      const latestBoard = boards.find((b) => b._id === board._id) || board;
      // IMPORTANT: Always match by view ID first, only use type as fallback
      const cv = currentView[board._id];
      
      let v;
      if (cv?.id) {
        // Prioritize ID match - if cv.id exists, ONLY match by ID
        v = latestBoard.viewsType?.find((vt) => vt.id === cv.id);
      } else if (cv?.type) {
        // Only fallback to type if no ID is available
        v = latestBoard.viewsType?.find((vt) => vt.viewType === cv.type);
      }
      
      const dsId = v?.databaseSourceId;
      
      if (!dsId) {
        toast.error("Data source not found for current view!");
        return;
      }

      const normalizedDsId = typeof dsId === "string" ? dsId : String(dsId);

      const { deleteWithAuth } = await import("@/lib/api-helpers");
      const res = await deleteWithAuth("/api/database/deleteProperty", {
        body: JSON.stringify({
          dataSourceId: normalizedDsId,
          propertyId: property.id,
        }),
      });
      
      const response = res as { success: boolean; dataSource?: any; notes?: any[]; message?: string };

      if (!response.success) {
        toast.error("Failed to delete property!");
        return;
      }

      // Update data source in context from API response
      if (response.dataSource) {
        const ds = response.dataSource;
        const responseDsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : normalizedDsId;
        setDataSource(responseDsId, ds);
      }

      // Update notes in context from API response
      if (response.notes && Array.isArray(response.notes)) {
        updateAllNotes(normalizedDsId, response.notes);
      }

      // Update property order to remove the deleted property
      const currentOrder = propertyOrder[board._id] || [];
      const updatedOrder = currentOrder.filter((propId) => propId !== property.id);
      setPropertyOrder(board._id, updatedOrder);

      toast.success("Property deleted successfully!");
      
      // Close the modal and dropdown
      setShowDeleteModal(false);
      onClose();
    } catch (err) {
      console.error("Failed to delete property:", err);
      toast.error("Failed to delete property!");
    }
  };

  const resolvedType = property.type === "formula"
    ? boardProperty?.formulaReturnType ?? "text"
    : property.type;

  // Check if property is a default property (can't be deleted)
  const isDefault = boardProperty?.default || false;
  const isTitle = property.id === "title";

  // Check if property types support certain features
  const isSortable = ["status", "select", "person", "priority", "text", "number", "date", "checkbox", "boolean"].includes(
    resolvedType,
  );
  const isFilterable = property.type !== "formula" && [
    "status",
    "select",
    "multi_select",
    "person",
    "priority",
    "date",
    "checkbox",
    "text",
    "boolean",
    "number",
  ].includes(resolvedType);
  const isGroupable = ["status", "select", "person", "priority", "text", "boolean"].includes(resolvedType);

  // Get icon based on property type
  const getPropertyIcon = () => {
    if (property.type === "formula") {
      return <Calculator className="w-4 h-4" />;
    }
    switch (resolvedType) {
      case "text":
        return <Type className="w-4 h-4 text-muted-foreground" />;
      case "status":
        return <Tag className="w-4 h-4 text-muted-foreground" />;
      case "select":
        return <Tag className="w-4 h-4 text-muted-foreground  " />;
      case "multi_select":
        return <ListChecks className="w-4 h-4 text-muted-foreground " />;
      case "person":
        return <User className="w-4 h-4 text-muted-foreground " />;
      case "date":
        return <Calendar className="w-4 h-4 text-muted-foreground" />;
      case "checkbox":
        return <CheckSquare className="w-4 h-4 text-muted-foreground" />;
      case "number":
        return <Hash className="w-4 h-4 text-muted-foreground" />;
      case "priority":
        return <Flag className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Monitor className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Build menu items array - MUST be before any conditional returns
  const menuItems: DropdownMenuItemProps[] = useMemo(() => {
    const items: DropdownMenuItemProps[] = [];
    let itemIndex = 0;

    // Property name header (always first)
    items.push({
      id: 'property-header',
      label: property.name.charAt(0).toUpperCase() + property.name.slice(1),
      icon: getPropertyIcon(),
      onClick: () => {}, // Header is not clickable
      disabled: true,
      className: "font-medium",
    });
    itemIndex++;

    // Change type (conditional)
    if (!isTitle) {
      items.push({
        id: 'change-type',
        label: "Type",
        icon: <DropdownMenuIcons.Type />,
        onClick: () => {}, // Handled separately
        disabled: isDefault,
        count: property.name.charAt(0).toUpperCase() + property.name.slice(1),
        hasChevron: !isDefault,
        rightElement: isDefault ? (
          <Lock className="w-4 h-4 text-muted-foreground" />
        ) : undefined,
      });
      itemIndex++;
    }

    // Edit property (conditional)
    if (!isTitle && onEdit) {
      items.push({
        id: 'edit-property',
        label: "Edit property",
        icon: <DropdownMenuIcons.Rename />,
        onClick: () => setShowEditModal(true),
      });
      itemIndex++;
    }

    // Filter (conditional)
    if (isFilterable && onFilter) {
      items.push({
        id: 'filter',
        label: "Filter",
        icon: <DropdownMenuIcons.Filter />,
        onClick: () => setShowFilterView(true),
        rightElement: hasFilters ? (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        ) : undefined,
      });
      itemIndex++;
    }

    // Sort (conditional)
    if (isSortable && onSort) {
      items.push({
        id: 'sort',
        label: "Sort",
        icon: <DropdownMenuIcons.Sort />,
        onClick: () => setShowSortView(true),
        hasChevron: true,
        rightElement: hasSorts ? (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        ) : undefined,
      });
      itemIndex++;
    }

    // Group / Ungroup (conditional)
    if (isGroupable && onGroup) {
      items.push({
        id: 'group',
        label: isGrouped ? 'Ungroup' : 'Group',
        icon: <DropdownMenuIcons.Group />,
        onClick: () => handleAction(onGroup),
        rightElement: isGrouped ? (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        ) : undefined,
      });
      itemIndex++;
    }

    // Hide (conditional)
    if (!isTitle && onHide) {
      items.push({
        id: 'hide',
        label: "Hide",
        icon: <DropdownMenuIcons.Hide />,
        onClick: () => handleAction(onHide),
      });
      itemIndex++;
    }

    // Wrap in view (conditional)
    if (onWrapInView) {
      items.push({
        id: 'wrap-in-view',
        label: "Wrap in view",
        icon: <DropdownMenuIcons.WrapText />,
        onClick: () => handleAction(onWrapInView),
        hasChevron: true,
      });
      itemIndex++;
    }

    // Display as (conditional)
    if (onDisplayAs) {
      items.push({
        id: 'display-as',
        label: "Display as",
        icon: <DropdownMenuIcons.View />,
        onClick: () => handleAction(onDisplayAs),
        hasChevron: true,
      });
      itemIndex++;
    }

    // Insert left (conditional)
    if (!isTitle && onInsertLeft) {
      items.push({
        id: 'insert-left',
        label: "Insert left",
        icon: <DropdownMenuIcons.InsertLeft />,
        onClick: () => handleAction(onInsertLeft),
      });
      itemIndex++;
    }

    // Insert right (conditional)
    if (!isTitle && onInsertRight) {
      items.push({
        id: 'insert-right',
        label: "Insert right",
        icon: <DropdownMenuIcons.InsertRight />,
        onClick: () => handleAction(onInsertRight),
      });
      itemIndex++;
    }

    // Delete property (conditional)
    if (!isTitle) {
      items.push({
        id: 'delete-property',
        label: "Delete property",
        icon: <DropdownMenuIcons.Delete />,
        onClick: () => setShowDeleteModal(true),
        variant: 'destructive',
      });
    }

    return items;
  }, [
    property,
    isTitle,
    isDefault,
    onEdit,
    isFilterable,
    onFilter,
    hasFilters,
    isSortable,
    onSort,
    hasSorts,
    isGroupable,
    onGroup,
    isGrouped,
    onHide,
    onWrapInView,
    onDisplayAs,
    onInsertLeft,
    onInsertRight,
    handleAction,
    setShowEditModal,
    setShowFilterView,
    setShowSortView,
    setShowDeleteModal,
    getPropertyIcon,
  ]);

  // Calculate divider positions based on actual menu items array
  // Sections:
  // 1. Property header
  // 2. Type, Edit property
  // 3. Filter, Sort, Group (same section)
  // 4. Hide, Display as, Wrap in view (same section)
  // 5. Insert left, Insert right (same section)
  // 6. Delete property
  const dividerAfter = useMemo(() => {
    const dividers: number[] = [];
    let itemIndex = 0;

    // 1. First line after property header (index 0)
    dividers.push(itemIndex);
    itemIndex++;

    // 2. Second line after Type/Edit property section
    if (!isTitle) {
      itemIndex++; // Type
      if (onEdit) {
        dividers.push(itemIndex); // After Edit property
        itemIndex++;
      } else {
        // If no Edit, divider after Type
        dividers.push(itemIndex);
        itemIndex++;
      }
    }

    // 3. Third line after Filter/Sort/Group section (after the last item in this section)
    // Count all items in this section first
    let filterSortGroupCount = 0;
    if (isFilterable && onFilter) filterSortGroupCount++;
    if (isSortable && onSort) filterSortGroupCount++;
    if (isGroupable && onGroup) filterSortGroupCount++;
    
    // Add items to index
    if (isFilterable && onFilter) {
      itemIndex++; // Filter
    }
    if (isSortable && onSort) {
      itemIndex++; // Sort
    }
    if (isGroupable && onGroup) {
      itemIndex++; // Group
    }
    
    // Add divider after the last item in Filter/Sort/Group section
    if (filterSortGroupCount > 0) {
      dividers.push(itemIndex - 1); // After the last item (itemIndex was already incremented)
    }

    // 4. Fourth line after Hide/Display as/Wrap in view section (after the last item in this section)
    // Note: Order in menuItems array is: Hide, Wrap in view, Display as
    // Count all items in this section first
    let hideDisplayWrapCount = 0;
    if (!isTitle && onHide) hideDisplayWrapCount++;
    if (onWrapInView) hideDisplayWrapCount++;
    if (onDisplayAs) hideDisplayWrapCount++;
    
    // Add items to index (matching the exact order from menuItems array)
    if (!isTitle && onHide) {
      itemIndex++; // Hide
    }
    if (onWrapInView) {
      itemIndex++; // Wrap in view
    }
    if (onDisplayAs) {
      itemIndex++; // Display as
    }
    
    // Add divider after the last item in Hide/Display as/Wrap section
    if (hideDisplayWrapCount > 0) {
      dividers.push(itemIndex - 1); // After the last item (itemIndex was already incremented)
    }

    // 5. Fifth line after Insert left/Insert right section (after the last item in this section)
    // Count all items in this section first
    let insertCount = 0;
    if (!isTitle && onInsertLeft) insertCount++;
    if (!isTitle && onInsertRight) insertCount++;
    
    // Add items to index
    if (!isTitle && onInsertLeft) {
      itemIndex++; // Insert left
    }
    if (!isTitle && onInsertRight) {
      itemIndex++; // Insert right
    }
    
    // Add divider after the last item in Insert section
    if (insertCount > 0) {
      dividers.push(itemIndex - 1); // After the last item (itemIndex was already incremented)
    }

    // Delete property is last, no divider after it

    return dividers;
  }, [
    isTitle,
    onEdit,
    isFilterable,
    onFilter,
    isSortable,
    onSort,
    isGroupable,
    onGroup,
    onHide,
    onWrapInView,
    onDisplayAs,
    onInsertLeft,
    onInsertRight,
  ]);

  // Early returns AFTER all hooks are called
  // If showing edit modal, render it
  if (showEditModal && boardProperty) {
    return (
      <EditSinglePropertyModal
        board={board}
        propertyId={property.id}
        property={boardProperty}
        onClose={() => {
          setShowEditModal(false);
          onClose();
        }}
        onBack={() => setShowEditModal(false)}
      />
    );
  }

  // If showing filter view for this specific property
  if (showFilterView) {
    return (
      <SinglePropertyFilterView
        property={property}
        boardProperty={boardProperty}
        currentFilters={filters[property.id] || []}
        workspaceMembers={workspaceMembers}
        onApply={(selectedValues) => {
          const newFilters = { ...filters };
          if (selectedValues.length > 0) {
            newFilters[property.id] = selectedValues;
          } else {
            delete newFilters[property.id];
          }
          onApplyFilters(newFilters);
          setShowFilterView(false);
          onClose();
        }}
        onBack={() => setShowFilterView(false)}
      />
    );
  }

  // If showing sort view for this specific property
  if (showSortView) {
    return (
      <SinglePropertySortView
        property={property}
        currentSort={sortBy.find(s => s.propertyId === property.id)}
        onApply={(direction) => {
          const newSorts = sortBy.filter(s => s.propertyId !== property.id);
          if (direction) {
            newSorts.push({ propertyId: property.id, direction });
          }
          onApplySort(newSorts);
          setShowSortView(false);
          onClose();
        }}
        onBack={() => setShowSortView(false)}
        onRemove={() => {
          const newSorts = sortBy.filter(s => s.propertyId !== property.id);
          onApplySort(newSorts);
          setShowSortView(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-md shadow-2xl min-w-[240px] py-1"
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownMenu items={menuItems} dividerAfter={dividerAfter} />

      {/* Delete Property Modal */}
      <DeleteConfirmationModal
        header="Delete Property"
        isOpen={showDeleteModal}
        title="Delete Property"
        message={`Are you sure you want to delete ${property.name?.toLocaleUpperCase() ?? 'this property'} from the board?`}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteProperty}
      />
    </div>
  );

// Helper component for single property filter
function SinglePropertyFilterView({
  property,
  boardProperty,
  currentFilters,
  workspaceMembers,
  onApply,
  onBack,
}: {
  property: { id: string; name: string; type: string };
  boardProperty?: BoardProperty;
  currentFilters: string[];
  workspaceMembers: Array<{ userId: string; userName: string; userEmail: string }>;
  onApply: (values: string[]) => void;
  onBack: () => void;
}) {
  const [selectedValues, setSelectedValues] = useState<string[]>(currentFilters);

  const getOptions = () => {
    if (property.type === "person") {
      return workspaceMembers.map((m) => ({ id: m.userId, name: m.userName }));
    }
    if (boardProperty?.options) {
      return boardProperty.options.map((opt) => ({ id: opt.name, name: opt.name }));
    }
    return [];
  };

  const options = getOptions();

  const toggleOption = (optionId: string) => {
    if (selectedValues.includes(optionId)) {
      setSelectedValues(selectedValues.filter((v) => v !== optionId));
    } else {
      setSelectedValues([...selectedValues, optionId]);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-md shadow-2xl min-w-[240px] py-1">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">Filter by {property.name.charAt(0).toUpperCase() + property.name.slice(1)}</span>
        </div>
        <button
          onClick={onBack}
          className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1"
          type="button"
          aria-label="Close filter"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Options */}
      <div className="py-1 max-h-[300px] overflow-y-auto">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => toggleOption(option.name)}
            className="flex items-center justify-between w-full px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-[#2c2c2c] transition-colors text-left"
            type="button"
          >
            <span className="text-gray-700 dark:text-gray-200">{option.name}</span>
            {selectedValues.includes(option.name) && (
              <Check className="w-4 h-4 text-blue-500" />
            )}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setSelectedValues([]);
            onApply([]);
          }}
          className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          type="button"
        >
          Clear
        </button>
        <button
          onClick={() => onApply(selectedValues)}
          className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
          type="button"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// Helper component for single property sort
function SinglePropertySortView({
  property,
  currentSort,
  onApply,
  onBack,
  onRemove,
}: {
  property: { id: string; name: string; type: string };
  currentSort?: { propertyId: string; direction: 'ascending' | 'descending' };
  onApply: (direction: 'ascending' | 'descending' | null) => void;
  onBack: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-md shadow-2xl min-w-[200px] py-1">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">Sort {property.name.charAt(0).toUpperCase() + property.name.slice(1)}</span>
        </div>
        <button
          onClick={onBack}
          className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1"
          type="button"
          aria-label="Close sort"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Options */}
      <div className="py-1">
        <button
          onClick={() => onApply('ascending')}
          className="flex items-center gap-3 w-full px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-[#2c2c2c] transition-colors text-left"
          type="button"
        >
          <ArrowUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-gray-700 dark:text-gray-200">Ascending</span>
          {currentSort?.direction === 'ascending' && (
            <Check className="w-4 h-4 text-blue-500 ml-auto" />
          )}
        </button>
        <button
          onClick={() => onApply('descending')}
          className="flex items-center gap-3 w-full px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-[#2c2c2c] transition-colors text-left"
          type="button"
        >
          <ArrowDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-gray-700 dark:text-gray-200">Descending</span>
          {currentSort?.direction === 'descending' && (
            <Check className="w-4 h-4 text-blue-500 ml-auto" />
          )}
        </button>

        {currentSort && (
          <>
            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
            <button
              onClick={onRemove}
              className="flex items-center gap-3 w-full px-3 py-1.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
              type="button"
            >
              <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400">Remove sort</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
}
