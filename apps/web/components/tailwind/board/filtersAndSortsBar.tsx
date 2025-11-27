"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, ArrowUpDown, Check } from "lucide-react";
import { ViewCollection, BoardProperty } from "@/types/board";
import { useBoard } from "@/contexts/boardContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import FilterPropertiesModal from "./filterPropertiesModal";
import SortModal from "./sortPropertiesModel";
import AdvancedFilterModal from "./advancedFilterModal";
import { PROPERTY_TYPES } from "./addPropertyDialog";
import { updateFilters, updateSorts, updateAdvancedFilters } from "@/services-frontend/boardServices/databaseSettingsService";
import { toast } from "sonner";
import { getColorStyles } from "@/utils/colorStyles";

interface FiltersAndSortsBarProps {
  board: ViewCollection;
  boardProperties: Record<string, BoardProperty>;
}

export default function FiltersAndSortsBar({ board, boardProperties }: FiltersAndSortsBarProps) {
  const { 
    getFilters, 
    getSortBy, 
    getGroupBy,
    getAdvancedFilters: getAdvancedFiltersFromContext,
    currentView,
    boards,
    setBoardFilters,
    setBoardSortBy,
    setAdvancedFilters,
    updateBoard,
    getRelationNoteTitle,
    getNoteById,
    getNotesByDataSourceId
  } = useBoard();
  const { workspaceMembers } = useWorkspaceContext();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showAdvancedFilterModal, setShowAdvancedFilterModal] = useState(false);
  const [selectedPropertyForOptions, setSelectedPropertyForOptions] = useState<string | null>(null);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const optionModalRef = useRef<HTMLDivElement>(null);
  const filterModalRef = useRef<HTMLDivElement>(null);
  const sortModalRef = useRef<HTMLDivElement>(null);
  const advancedFilterModalRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const advancedFilterButtonRef = useRef<HTMLButtonElement>(null);

  const boardId = board._id;
  const currentViewData = currentView[boardId];
  const latestBoard = boards.find((b) => b._id === boardId) || board;

  const getCurrentViewTypeId = (): string | null => {
    if (!latestBoard || !currentViewData) return null;

    let view;
    if (currentViewData.id) {
      const currentViewId = typeof currentViewData.id === "string" ? currentViewData.id : String(currentViewData.id);
      view = latestBoard.viewsType?.find((v) => {
        const viewId = typeof v.id === "string" ? v.id : String(v.id);
        return viewId === currentViewId;
      });
    } else if (currentViewData.type) {
      view = latestBoard.viewsType?.find((v) => v.viewType === currentViewData.type);
    }

    if (!view) return null;
    return view.id ? (typeof view.id === "string" ? view.id : String(view.id)) : null;
  };

  const viewTypeId = getCurrentViewTypeId();
  const activeFilters = viewTypeId ? getFilters(boardId) : {};
  const activeSorts = viewTypeId ? getSortBy(boardId) : [];
  const activeGroupBy = viewTypeId ? getGroupBy(boardId) : undefined;

  // Get advanced filters from view settings
  // Use context function to get advanced filters (loaded from database on page reload)
  const advancedFilters = getAdvancedFiltersFromContext(boardId);
  
  // Count total rules in all groups (including nested)
  const countAdvancedFilterRules = (groups: any[]): number => {
    let count = 0;
    for (const group of groups) {
      count += group.rules?.length || 0;
      if (group.groups && group.groups.length > 0) {
        count += countAdvancedFilterRules(group.groups);
      }
    }
    return count;
  };

  const advancedFilterRuleCount = countAdvancedFilterRules(advancedFilters);
  const advancedFilterLabelCount = advancedFilterRuleCount || 0;

  const hasFilters = activeFilters && Object.keys(activeFilters).length > 0;
  const hasSorts = activeSorts && activeSorts.length > 0;
  const hasGroupBy = activeGroupBy !== undefined;
  const hasAdvancedFilters = advancedFilters.length > 0;

  // Always render the bar (even if empty) to show the "Add filter" button

  const capitalize = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getPropertyIcon = (type: string) => {
    const found = PROPERTY_TYPES.find((p) => p.type === type);
    return found?.icon || null;
  };

  const getFilterDisplayValue = (propId: string, values: string[]): string => {
    const prop = boardProperties[propId];
    if (!prop) return values.join(", ");

    if (prop.type === "person") {
      return values.map(val => {
        const member = workspaceMembers.find(m => m.userName === val || m.userEmail === val);
        return member?.userName || val;
      }).join(", ");
    }

    if (prop.type === "relation") {
      // For relation, values are note titles - get current titles from context
      return values.map(val => {
        // Try to find note by title first (for backward compatibility)
        // Search through all relation properties to find the note
        let foundNote: any = null;
        for (const [pId, p] of Object.entries(boardProperties)) {
          if (p.type === "relation" && p.linkedDatabaseId) {
            const notes = getNotesByDataSourceId(p.linkedDatabaseId);
            foundNote = notes.find((n: any) => n.title === val || String(n._id) === val);
            if (foundNote) break;
          }
        }
        
        // Also try getNoteById
        if (!foundNote) {
          foundNote = getNoteById(val);
        }
        
        if (foundNote) {
          const linkedDatabaseId = prop.linkedDatabaseId || "";
          return getRelationNoteTitle(String(foundNote._id || val), linkedDatabaseId, val);
        }
        return val;
      }).join(", ");
    }

    return values.join(", ");
  };

  const getPropertyName = (propId: string): string => {
    const prop = boardProperties[propId];
    return prop ? capitalize(prop.name) : propId;
  };

  const getPropertyOptions = (propId: string) => {
    const prop = boardProperties[propId];
    if (!prop) return [];

    if (prop.type === "person") {
      return workspaceMembers.map((m) => ({
        id: m.userId,
        name: m.userName,
      }));
    }

    if (prop.type === "relation" && prop.linkedDatabaseId) {
      // Get relation notes from context
      const notes = getNotesByDataSourceId(prop.linkedDatabaseId);
      return notes.map((note: any) => ({
        id: note._id || note.id || "",
        name: note.title || "Untitled",
      }));
    }

    return prop.options || [];
  };

  const getOptionDisplay = (propId: string, optionName: string, optionId?: string) => {
    const prop = boardProperties[propId];
    if (!prop) return { name: optionName, color: "default" };

    if (prop.type === "person") {
      const member = workspaceMembers.find((m) => m.userName === optionName || m.userEmail === optionName);
      return { name: member?.userName || optionName, color: "default" };
    }

    if (prop.type === "relation" && optionId) {
      // Get current title from context (updates automatically)
      const linkedDatabaseId = prop.linkedDatabaseId || "";
      const currentTitle = getRelationNoteTitle(optionId, linkedDatabaseId, optionName);
      return { 
        name: currentTitle, 
        color: "default"
      };
    }

    const option = prop.options?.find((opt: any) => opt.name === optionName);
    return {
      name: option?.name || optionName,
      color: option?.color || "default",
    };
  };


  const getStatusIcon = (type: string) => {
    switch (type) {
      case "status":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.501 2.391a8 8 0 0 1 .998 0 .625.625 0 0 1-.081 1.247 7 7 0 0 0-.836 0 .625.625 0 0 1-.08-1.247m3.034 1.053a.625.625 0 0 1 .838-.284q.45.222.863.5a.625.625 0 0 1-.695 1.038 6 6 0 0 0-.722-.417.625.625 0 0 1-.284-.837m-5.072 0a.625.625 0 0 1-.284.837q-.375.185-.722.417a.625.625 0 0 1-.695-1.038q.414-.278.863-.5a.625.625 0 0 1 .838.284m8.009 2.147a.625.625 0 0 1 .867.172q.278.414.5.863a.625.625 0 0 1-1.12.554 6 6 0 0 0-.418-.722.625.625 0 0 1 .171-.867m-10.946 0c.287.192.363.58.171.867q-.232.346-.417.722a.625.625 0 1 1-1.12-.554q.221-.45.499-.863a.625.625 0 0 1 .867-.172m12.418 3.327a.625.625 0 0 1 .664.583 8 8 0 0 1 0 .998.625.625 0 0 1-1.248-.081 6 6 0 0 0 0-.836.625.625 0 0 1 .584-.664m-13.89 0c.345.022.606.32.583.664a7 7 0 0 0 0 .836.625.625 0 0 1-1.247.08 8 8 0 0 1 0-.997.625.625 0 0 1 .664-.583m13.501 3.618c.31.153.437.528.284.838q-.222.45-.5.863a.625.625 0 1 1-1.038-.695q.231-.346.417-.722a.625.625 0 0 1 .837-.284m-13.112 0a.625.625 0 0 1 .837.284q.185.375.417.722a.625.625 0 0 1-1.038.695 8 8 0 0 1-.5-.864.625.625 0 0 1 .284-.837m2.147 2.937a.625.625 0 0 1 .867-.171q.346.231.722.417a.625.625 0 1 1-.554 1.12 8 8 0 0 1-.863-.499.625.625 0 0 1-.172-.867m8.818 0a.625.625 0 0 1-.172.867 8 8 0 0 1-.864.5.625.625 0 0 1-.553-1.12q.375-.187.722-.418a.625.625 0 0 1 .867.171m-5.491 1.472a.625.625 0 0 1 .664-.584 6 6 0 0 0 .836 0 .625.625 0 0 1 .08 1.248 8 8 0 0 1-.997 0 .625.625 0 0 1-.583-.664"></path>
          </svg>
        );
      case "priority":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.954 12.856a.718.718 0 0 1-1.079-.62V7.764c0-.554.6-.9 1.08-.62l3.833 2.236a.718.718 0 0 1 0 1.24z"></path>
            <path d="M2.375 10a7.625 7.625 0 1 0 15.25 0 7.625 7.625 0 0 0-15.25 0M10 16.375a6.375 6.375 0 1 1 0-12.75 6.375 6.375 0 0 1 0 12.75"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  const handleOptionToggle = async (propId: string, optionName: string) => {
    const current = activeFilters[propId] || [];
    let updated: string[];

    if (current.includes(optionName)) {
      updated = current.filter((name) => name !== optionName);
    } else {
      updated = [...current, optionName];
    }

    const updatedFilters = (() => {
      if (updated.length === 0) {
        const { [propId]: _, ...rest } = activeFilters;
        return rest;
      }

      return { ...activeFilters, [propId]: updated };
    })();

    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }

    // Store previous state for rollback
    const previousFilters = activeFilters;
    const previousBoard = latestBoard;

    // Optimistic update: update context first
    setBoardFilters(viewTypeId, updatedFilters);
    const optimisticViewsType = latestBoard.viewsType.map((v) => {
      const vId = typeof v.id === "string" ? v.id : String(v.id);
      if (vId === viewTypeId) {
        return {
          ...v,
          settings: {
            ...v.settings,
            filters: Object.entries(updatedFilters).map(([propertyId, values]) => ({
              propertyId,
              value: values,
            })),
          },
        };
      }
      return v;
    });
    updateBoard(boardId, { ...latestBoard, viewsType: optimisticViewsType });

    try {
      const res = await updateFilters(viewTypeId, updatedFilters);

      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(boardId, { ...latestBoard, viewsType: updatedViewsType });
      }
    } catch (err) {
      console.error("Failed to update filters:", err);
      toast.error("Failed to update filters");
      // Rollback on error
      setBoardFilters(viewTypeId, previousFilters);
      updateBoard(boardId, previousBoard);
    }
  };

  const handleClearSelection = async (propId: string) => {
    const updatedFilters = (() => {
      const { [propId]: _, ...rest } = activeFilters;
      return rest;
    })();

    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }

    // Store previous state for rollback
    const previousFilters = activeFilters;
    const previousBoard = latestBoard;

    // Optimistic update: update context first
    setBoardFilters(viewTypeId, updatedFilters);
    const optimisticViewsType = latestBoard.viewsType.map((v) => {
      const vId = typeof v.id === "string" ? v.id : String(v.id);
      if (vId === viewTypeId) {
        return {
          ...v,
          settings: {
            ...v.settings,
            filters: Object.entries(updatedFilters).map(([propertyId, values]) => ({
              propertyId,
              value: values,
            })),
          },
        };
      }
      return v;
    });
    updateBoard(boardId, { ...latestBoard, viewsType: optimisticViewsType });

    try {
      const res = await updateFilters(viewTypeId, updatedFilters);

      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(boardId, { ...latestBoard, viewsType: updatedViewsType });
      }

      setShowOptionModal(false);
      setSelectedPropertyForOptions(null);
    } catch (err) {
      console.error("Failed to update filters:", err);
      toast.error("Failed to update filters");
      // Rollback on error
      setBoardFilters(viewTypeId, previousFilters);
      updateBoard(boardId, previousBoard);
    }
  };

  const renderOptionModal = (propId: string) => {
    const prop = boardProperties[propId];
    const options = getPropertyOptions(propId);
    const selectedOptions = activeFilters[propId] || [];

    return (
      <>
        <div className="flex-shrink-0">
          <div className="p-1 pt-0">
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="truncate">{capitalize(prop?.name || "")} is </span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
          <div className="flex-1">
            <div className="pb-1">
              {options.map((opt: any) => {
                const isSelected = selectedOptions.includes(opt.name);
                const display = getOptionDisplay(propId, opt.name, opt.id);
                const color = display.color || "default";

                return (
                  <div
                    key={opt.id || opt.name}
                    role="menuitem"
                    tabIndex={-1}
                    className={`flex items-center gap-2 px-4 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${
                      isSelected ? "bg-gray-100 dark:hover:bg-gray-800" : ""
                    }`}
                    onClick={() => handleOptionToggle(propId, opt.name)}
                  >
                    <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleOptionToggle(propId, opt.name)}
                        className="absolute opacity-0 w-full h-full cursor-pointer"
                      />
                      <div
                        className={`w-3.5 h-3.5 rounded border transition-colors ${
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {prop?.type === "status" && (() => {
                        const colors = getColorStyles(color);
                        if (!colors) return null;
                        return (
                          <div 
                            className="inline-flex items-center flex-shrink-1 min-w-0 max-w-full h-5 rounded-full px-2 py-0.5 text-sm font-medium"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                            }}
                          >
                            <div 
                              className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0"
                              style={{ backgroundColor: colors.dot }}
                            ></div>
                            <span className="truncate">{capitalize(display.name)}</span>
                          </div>
                        );
                      })()}
                      {prop?.type === "priority" && (
                        <div className="flex items-center gap-1">
                          {getStatusIcon("priority")}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {capitalize(display.name)}
                          </span>
                        </div>
                      )}
                      {prop?.type !== "status" && prop?.type !== "priority" && (
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {capitalize(display.name)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 mt-1">
            <button
              onClick={() => handleClearSelection(propId)}
              className="w-full px-2 py-2 text-sm text-left text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              Clear selection
            </button>
          </div>
        </div>
      </>
    );
  };

  // Close modals on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // Handle option modal
      if (showOptionModal && optionModalRef.current && !optionModalRef.current.contains(target)) {
        const clickedButton = (target as HTMLElement).closest('button[aria-haspopup="dialog"]');
        if (clickedButton && clickedButton.getAttribute('data-filter-prop-id') === selectedPropertyForOptions) {
          return;
        }
        setShowOptionModal(false);
        setSelectedPropertyForOptions(null);
      }
      
      // Handle filter modal
      if (showFilterModal && filterModalRef.current && !filterModalRef.current.contains(target)) {
        if (filterButtonRef.current && filterButtonRef.current.contains(target)) {
          return;
        }
        setShowFilterModal(false);
      }
      
      // Handle sort modal
      if (showSortModal && sortModalRef.current && !sortModalRef.current.contains(target)) {
        if (sortButtonRef.current && sortButtonRef.current.contains(target)) {
          return;
        }
        setShowSortModal(false);
      }
      
      // Handle advanced filter modal
      if (showAdvancedFilterModal && advancedFilterModalRef.current && !advancedFilterModalRef.current.contains(target)) {
        if (advancedFilterButtonRef.current && advancedFilterButtonRef.current.contains(target)) {
          return;
        }
        setShowAdvancedFilterModal(false);
      }
    }
    
    if (showOptionModal || showFilterModal || showSortModal || showAdvancedFilterModal) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showOptionModal, showFilterModal, showSortModal, showAdvancedFilterModal, selectedPropertyForOptions]);

  // Only show the bar if there are active filters, sorts, or advanced filters
  if (!hasFilters && !hasSorts && !hasAdvancedFilters) {
    return null;
  }

  return (
    <>
      <div className="w-full border-t border-gray-200 dark:border-gray-700 !m-0 z-[86]">
        <div className="w-full rounded-md z-[86]" tabIndex={0} role="button">
          <div className="flex pt-1">
            <div className="relative flex-grow-0">
              <div className="flex items-center pt-2 pb-2">
                {/* Sorts Button */}
                {hasSorts && (
                  <div className="relative inline-flex">
                    <div data-popup-origin="true" className="contents">
                      <div className="rounded-2xl mr-1.5 inline-flex">
                        <button
                          ref={sortButtonRef}
                          onClick={() => setShowSortModal(!showSortModal)}
                          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-sm rounded-full h-6 leading-6 px-2"
                          type="button"
                          aria-expanded={showSortModal}
                          aria-haspopup="dialog"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="-mt-px max-w-[220px] whitespace-nowrap truncate">
                            {activeSorts.length} {activeSorts.length === 1 ? "Sort" : "sorts"}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                        </button>
                      </div>
                    </div>
                    {showSortModal && (
                      <div
                        ref={sortModalRef}
                        className="absolute left-0 top-full mt-1 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg z-[100]"
                      >
                        <SortModal
                          board={board}
                          boardProperties={boardProperties}
                          sorts={activeSorts}
                          onClose={() => setShowSortModal(false)}
                          onApply={async (sorts) => {
                            if (!viewTypeId) {
                              toast.error("View type ID not found");
                              return;
                            }
                            try {
                              const res = await updateSorts(viewTypeId, sorts);
                              setBoardSortBy(viewTypeId, sorts);
                              if (res.viewType) {
                                const updatedViewsType = latestBoard.viewsType.map((v) => {
                                  const vId = typeof v.id === "string" ? v.id : String(v.id);
                                  return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
                                });
                                updateBoard(boardId, { ...latestBoard, viewsType: updatedViewsType });
                              }
                            } catch (err) {
                              console.error("Failed to update sorts:", err);
                              toast.error("Failed to update sorts");
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Divider */}
                {(hasSorts && (hasFilters || hasAdvancedFilters)) && (
                  <div className="border-r border-gray-200 dark:border-gray-700 h-6 ml-2 mr-3" />
                )}

                {/* Advanced Filters */}
                {hasAdvancedFilters && (
                  <div className="relative inline-flex">
                    <div data-popup-origin="true" className="contents">
                      <div className="rounded-2xl mr-1.5 inline-flex">
                        <button
                          ref={advancedFilterButtonRef}
                          onClick={() => setShowAdvancedFilterModal(!showAdvancedFilterModal)}
                          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-sm rounded-full h-6 leading-6 px-2"
                          type="button"
                          aria-expanded={showAdvancedFilterModal}
                          aria-haspopup="dialog"
                        >
                          <span className="-mt-px max-w-[220px] whitespace-nowrap truncate">
                            {`${advancedFilterLabelCount} ${advancedFilterLabelCount === 1 ? "rule" : "rules"}`}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                        </button>
                      </div>
                    </div>
                    {showAdvancedFilterModal && (
                      <div
                        ref={advancedFilterModalRef}
                        className="absolute left-0 top-full mt-1 z-[100]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AdvancedFilterModal
                          board={board}
                          boardProperties={boardProperties}
                          onClose={() => setShowAdvancedFilterModal(false)}
                          initialRules={(() => {
                            // Convert IAdvancedFilterGroup[] to rules array (flatten groups)
                            if (!advancedFilters || advancedFilters.length === 0) return [];
                            
                            const allRules: any[] = [];
                            const flattenGroup = (group: any) => {
                              if (group.rules && group.rules.length > 0) {
                                group.rules.forEach((rule: any, index: number) => {
                                  allRules.push({
                                    id: rule.id || `rule-${Date.now()}-${index}`,
                                    propertyId: rule.propertyId || null,
                                    operator: rule.operator || "contains",
                                    value: rule.value || "",
                                    booleanOperator: index > 0 ? (rule.booleanOperator || group.booleanOperator || "AND") : undefined,
                                  });
                                });
                              }
                              if (group.groups && group.groups.length > 0) {
                                group.groups.forEach((nestedGroup: any) => flattenGroup(nestedGroup));
                              }
                            };
                            
                            advancedFilters.forEach((group) => flattenGroup(group));
                            return allRules;
                          })()}
                          onApply={async (rules) => {
                            if (!viewTypeId) {
                              toast.error("View type ID not found");
                              return;
                            }

                            try {
                              // Convert rules to groups format for backend (single group with all rules)
                              const groups = rules.length > 0 ? [{
                                id: `group-${Date.now()}`,
                                booleanOperator: "AND" as const,
                                rules: rules.map((rule) => ({
                                  id: rule.id,
                                  propertyId: rule.propertyId!,
                                  operator: rule.operator,
                                  value: rule.value,
                                  booleanOperator: rule.booleanOperator, // Preserve booleanOperator
                                })),
                                groups: [],
                              }] : [];
                              
                              const res = await updateAdvancedFilters(viewTypeId, groups);

                              if (res.viewType) {
                                const updatedViewsType = latestBoard.viewsType.map((v) => {
                                  const vId = typeof v.id === "string" ? v.id : String(v.id);
                                  return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
                                });
                                updateBoard(boardId, { ...latestBoard, viewsType: updatedViewsType });
                                
                                // Update advanced filters in context
                                const settings = res.viewType?.settings as any;
                                const advancedFiltersFromResponse = settings?.advancedFilters || [];
                                setAdvancedFilters(viewTypeId, advancedFiltersFromResponse);
                              }
                              
                              toast.success("Advanced filters updated successfully");
                              setShowAdvancedFilterModal(false);
                            } catch (err) {
                              console.error("Failed to update advanced filters:", err);
                              toast.error(err instanceof Error ? err.message : "Failed to update advanced filters");
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Divider between advanced filters and regular filters */}
                {(hasAdvancedFilters && hasFilters) && (
                  <div className="border-r border-gray-200 dark:border-gray-700 h-6 ml-2 mr-3" />
                )}

                {/* Filters */}
                {hasFilters && (
                  <div className="flex m-0 flex-shrink-0">
                    {Object.entries(activeFilters).map(([propId, values]) => {
                      if (!values || values.length === 0) return null;
                      
                      const prop = boardProperties[propId];
                      if (!prop) return null;

                      const Icon = getPropertyIcon(prop.type);
                      const displayValue = getFilterDisplayValue(propId, values);
                      const propertyName = getPropertyName(propId);

                      const isOpen = selectedPropertyForOptions === propId && showOptionModal;

                      return (
                        <div key={propId} className="relative flex flex-row cursor-grab">
                          <div data-popup-origin="true" className="contents">
                            <div className="rounded-2xl mr-1.5 inline-flex">
                              <button
                                onClick={() => {
                                  // Toggle: if already open for this property, close it; otherwise open it
                                  if (isOpen) {
                                    setShowOptionModal(false);
                                    setSelectedPropertyForOptions(null);
                                  } else {
                                    setSelectedPropertyForOptions(propId);
                                    setShowOptionModal(true);
                                  }
                                }}
                                data-filter-prop-id={propId}
                                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-sm rounded-full h-6 leading-6 px-2"
                                type="button"
                                aria-expanded={isOpen}
                                aria-haspopup="dialog"
                              >
                                {Icon && (
                                  <div className="flex items-center justify-center flex-shrink-0 w-4 h-4">
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <span className="inline-block max-w-[180px] min-w-0 truncate">
                                  <span className="font-medium">{propertyName}</span>: <span>{displayValue}</span>
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                              </button>
                            </div>
                          </div>
                          {isOpen && (
                            <div
                              ref={optionModalRef}
                              className="absolute left-0 top-full mt-1 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg z-[100] w-[260px] min-w-[180px]"
                              style={{
                                maxWidth: "calc(100vw - 24px)"
                              }}
                            >
                              {renderOptionModal(propId)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Filter Button */}
                <div className="relative inline-flex">
                  <div data-popup-origin="true" className="contents">
                    <button
                      ref={filterButtonRef}
                      onClick={() => setShowFilterModal(!showFilterModal)}
                      className="inline-flex items-center gap-1 transition-opacity cursor-pointer hover:opacity-80 text-gray-500 dark:text-gray-400 h-6 px-[5px] pr-[9px] rounded-xl whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 mr-3"
                      type="button"
                      aria-expanded={showFilterModal}
                      aria-haspopup="dialog"
                    >
                      <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Filter</span>
                    </button>
                  </div>
                  {showFilterModal && (
                    <div
                      ref={filterModalRef}
                      className="absolute left-0 top-full mt-1 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg z-[100]"
                    >
                      <FilterPropertiesModal
                        board={board}
                        boardProperties={boardProperties}
                        onClose={() => setShowFilterModal(false)}
                        onApply={() => {}}
                        filters={activeFilters}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-start pt-1.5 ml-auto flex-shrink-0"></div>
          </div>
        </div>
      </div>

    </>
  );
}

