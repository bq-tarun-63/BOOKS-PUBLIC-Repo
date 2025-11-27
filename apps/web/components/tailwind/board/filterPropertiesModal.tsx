"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { BoardProperty, ViewCollection } from "@/types/board";
import { GripVertical, ChevronDown, Plus, Check, FileText, X, ListFilter } from "lucide-react";
import { PROPERTY_TYPES } from "./addPropertyDialog";
import { useBoard } from "@/contexts/boardContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { updateFilters } from "@/services-frontend/boardServices/databaseSettingsService";
import { toast } from "sonner";
import { getColorStyles } from "@/utils/colorStyles";
import { DropdownMenuHeader, DropdownMenuSearch, DropdownMenu } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";
import { computeRollupData, getRollupComparableValue, normalizeCalculation } from "@/utils/rollupUtils";
import AdvancedFilterModal from "./advancedFilterModal";
import { updateAdvancedFilters } from "@/services-frontend/boardServices/databaseSettingsService";

interface FilterPropertiesModalProps {
  board: ViewCollection;
  boardProperties: Record<string, BoardProperty>;
  onClose: () => void;
  onApply: (filters: Record<string, string[]>) => void;
  filters: Record<string, string[]>;
}

type FilterMode = "add" | "edit";

export default function FilterPropertiesModal({
  board,
  boardProperties,
  onClose,
  onApply,
  filters
}: FilterPropertiesModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const optionModalRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(() => filters || {});
  
  // Check if there are any filters (even with empty arrays)
  const hasActiveFilters = useMemo(() => {
    return selectedFilters && Object.keys(selectedFilters).length > 0;
  }, [selectedFilters]);
  
  const [mode, setMode] = useState<FilterMode>(() => {
    const initialHasFilters = filters && Object.keys(filters).length > 0;
    return initialHasFilters ? "edit" : "add";
  });
  
  useEffect(() => {
    if (hasActiveFilters) {
      setMode("edit");
    } else {
      setMode("add");
    }
  }, [hasActiveFilters]);
  const [selectedPropertyForOptions, setSelectedPropertyForOptions] = useState<string | null>(null);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [rollupInputValues, setRollupInputValues] = useState<Record<string, string>>({});
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const { workspaceMembers } = useWorkspaceContext();
  const { setBoardFilters, setAdvancedFilters, updateBoard, boards, currentView, getNotesByDataSourceId, getDataSource, getNoteById, getRelationNoteTitle, getCurrentDataSourceProperties } = useBoard();
  
  // Helper to convert IAdvancedFilterGroup[] to rules array (flatten groups)
  const convertAdvancedFiltersToRules = (advancedFilters: any[]): Array<{
    id: string;
    propertyId: string | null;
    operator: string;
    value: string | string[];
    booleanOperator?: "AND" | "OR";
  }> => {
    if (!advancedFilters || advancedFilters.length === 0) {
      return [];
    }
    
    // Flatten all groups into a single rules array
    const allRules: any[] = [];
    
    const flattenGroup = (group: any) => {
      if (group.rules && group.rules.length > 0) {
        group.rules.forEach((rule: any, index: number) => {
          // Handle value - could be string, array, or JSON string
          let ruleValue: string | string[] = "";
          if (Array.isArray(rule.value)) {
            ruleValue = rule.value;
          } else if (typeof rule.value === "string" && rule.value.startsWith("[") && rule.value.endsWith("]")) {
            // Try to parse JSON string
            try {
              ruleValue = JSON.parse(rule.value);
            } catch {
              ruleValue = rule.value;
            }
          } else {
            ruleValue = rule.value || "";
          }
          
          allRules.push({
            id: rule.id || `rule-${Date.now()}-${index}`,
            propertyId: rule.propertyId || null,
            operator: rule.operator || "contains",
            value: ruleValue,
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
  };

  const getCurrentViewTypeId = (boardId: string): string | null => {
    const currentViewData = currentView[boardId];
    if (!currentViewData) return null;
    
    const latestBoard = boards.find((b) => b._id === boardId) || board;
    if (!latestBoard) return null;
    
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

  const GROUPABLE_TYPES = ["status", "select", "person", "priority", "text", "number", "relation", "rollup"];

  const capitalize = (str: string) => {
    if (!str) return "";
    return str[0]?.toUpperCase() + str.slice(1);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // If option modal is open, only close it (not the main modal)
      if (showOptionModal && optionModalRef.current) {
        // Check if click is outside option modal but inside main modal
        if (
          !optionModalRef.current.contains(target) &&
          modalRef.current?.contains(target)
        ) {
          // Check if click is on the button that opened the modal (toggle behavior)
          const clickedButton = (target as HTMLElement).closest('button[aria-haspopup="dialog"]');
          if (clickedButton) {
            // Button click will handle toggle, so don't close here
            return;
          }
          // Click is outside option modal but inside main modal - close only option modal
          setShowOptionModal(false);
          setSelectedPropertyForOptions(null);
          return;
        }
      }
      
      // Close main modal only if option modal is not open
      if (
        !showOptionModal &&
        modalRef.current && 
        !modalRef.current.contains(target)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, showOptionModal]);

  const getPropertyIcon = (type: string) => {
    const found = PROPERTY_TYPES.find((p) => p.type === type);
    return found?.icon || null;
  };

  const filteredProperties = useMemo(() => {
    return Object.entries(boardProperties).filter(
      ([_, prop]) =>
        prop.name.toLowerCase().includes(search.toLowerCase()) &&
        GROUPABLE_TYPES.includes(prop.type)
    );
  }, [boardProperties, search]);

  const handlePropertySelect = (propId: string) => {
    const prop = boardProperties[propId];
    if (!prop) return;

    // Add property to filters locally (with empty options array) - don't save to backend yet
    const updatedFilters = {
      ...selectedFilters,
      [propId]: selectedFilters[propId] || []
    };

    setSelectedFilters(updatedFilters);
    setMode("edit");
    setSearch("");
    
    // Don't save to backend here - wait until user selects options
  };

  const handleOptionToggle = async (propId: string, optionName: string) => {
    const current = selectedFilters[propId] || [];
    let updated: string[];

    if (current.includes(optionName)) {
      updated = current.filter((name) => name !== optionName);
    } else {
      updated = [...current, optionName];
    }

    const updatedFilters = (() => {
      if (updated.length === 0) {
        const { [propId]: _, ...rest } = selectedFilters;
        return rest;
      }

      return { ...selectedFilters, [propId]: updated };
    })();

    const previousFilters = selectedFilters;
    const viewTypeId = getCurrentViewTypeId(board._id);
    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }

    const latestBoard = boards.find((b) => b._id === board._id) || board;
    const previousBoard = latestBoard;

    // Optimistic update: update context first
    setSelectedFilters(updatedFilters);
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
    updateBoard(board._id, { ...latestBoard, viewsType: optimisticViewsType });
    
    // Switch to edit mode when an option is selected (if still in add mode)
    if (mode === "add") {
      setMode("edit");
    }
    // Don't close the modal automatically - let user select multiple options
    
    try {
      const res = await updateFilters(viewTypeId, updatedFilters);

      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(board._id, { ...latestBoard, viewsType: updatedViewsType });
      }
      
      onApply(updatedFilters);
    } catch (err) {
      console.error("Failed to update filters:", err);
      toast.error("Failed to update filters");
      // Rollback on error
      setSelectedFilters(previousFilters);
      setBoardFilters(viewTypeId, previousFilters);
      updateBoard(board._id, previousBoard);
    }
  };

  const handleClearSelection = async (propId: string) => {
    const updatedFilters = (() => {
      const { [propId]: _, ...rest } = selectedFilters;
      return rest;
    })();

    const viewTypeId = getCurrentViewTypeId(board._id);
    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }

    // Store previous state for rollback
    const previousFilters = selectedFilters;
    const latestBoard = boards.find((b) => b._id === board._id) || board;
    const previousBoard = latestBoard;

    // Optimistic update: update context first
    setSelectedFilters(updatedFilters);
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
    updateBoard(board._id, { ...latestBoard, viewsType: optimisticViewsType });
    setShowOptionModal(false);
    setSelectedPropertyForOptions(null);

    try {
      const res = await updateFilters(viewTypeId, updatedFilters);

      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(board._id, { ...latestBoard, viewsType: updatedViewsType });
      }
      
      onApply(updatedFilters);
    } catch (err) {
      console.error("Failed to update filters:", err);
      toast.error("Failed to update filters");
      // Rollback on error
      setSelectedFilters(previousFilters);
      setBoardFilters(viewTypeId, previousFilters);
      updateBoard(board._id, previousBoard);
    }
  };

  const handleAddFilter = () => {
    setMode("add");
    setSearch("");
  };


  const [relationOptionsCache, setRelationOptionsCache] = useState<Record<string, Array<{ id: string; name: string; note?: any }>>>({});
  
  const getPropertyOptions = (propId: string): Array<{ id: string; name: string; note?: any }> => {
    const prop = boardProperties[propId];
    if (!prop) return [];

    // Handle rollup properties - only compute options when calculation is "original"
    if (prop.type === "rollup") {
      const normalizedCalc = normalizeCalculation(prop.rollup?.calculation);
      const isOriginal = normalizedCalc.category === "original";
      if (!isOriginal) {
        return [];
      }

      // Get all notes from current data source
      const currentDataSourceId = (() => {
        const currentViewData = currentView[board._id];
        if (!currentViewData) return null;
        const latestBoard = boards.find((b) => b._id === board._id) || board;
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
        const dsId = view?.databaseSourceId;
        return dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
      })();

      if (!currentDataSourceId) return [];

      const allNotes = getNotesByDataSourceId(currentDataSourceId);
      const allBoardProperties = getCurrentDataSourceProperties(board._id) || boardProperties;
      
      // Compute rollup values for all notes and get unique values
      const uniqueValues = new Set<string | number>();
      allNotes.forEach((note) => {
        const rollupResult = computeRollupData(
          note,
          prop,
          allBoardProperties,
          getNotesByDataSourceId,
          getDataSource,
        );
        const rollupValue = getRollupComparableValue(rollupResult);
        if (rollupValue !== null) {
          uniqueValues.add(rollupValue);
        }
      });

      // Convert to array of options
      return Array.from(uniqueValues)
        .sort((a, b) => {
          if (typeof a === "number" && typeof b === "number") return a - b;
          return String(a).localeCompare(String(b));
        })
        .map((value) => ({
          id: String(value),
          name: String(value),
        }));
    }

    if (prop.type === "person") {
      return workspaceMembers.map((m) => ({
        id: m.userId,
        name: m.userName || m.userEmail || "Unknown",
      }));
    }

    if (prop.type === "relation" && prop.linkedDatabaseId) {
      // Check cache first
      if (relationOptionsCache[propId]) {
        return relationOptionsCache[propId];
      }
      
      // Try to get from context first
      const normalizedDataSourceId = typeof prop.linkedDatabaseId === "string" 
        ? prop.linkedDatabaseId 
        : String(prop.linkedDatabaseId);
      
      const notes = getNotesByDataSourceId(normalizedDataSourceId);
      if (notes.length > 0) {
        // Return full note objects so we can display icon, title, and database properties
        const options = notes.map((note) => ({
          id: note._id || note.id || "",
          name: note.title || "Untitled",
          note: note, // Store full note object
        }));
        setRelationOptionsCache(prev => ({ ...prev, [propId]: options }));
        return options;
      }
      
      // If not in context, return empty and fetch async (will be handled when modal opens)
      return [];
    }

    return prop.options || [];
  };
  
  // Fetch relation options when property is selected
  useEffect(() => {
    if (selectedPropertyForOptions) {
      const prop = boardProperties[selectedPropertyForOptions];
      if (prop?.type === "relation" && prop.linkedDatabaseId && !relationOptionsCache[selectedPropertyForOptions]) {
        const fetchRelationOptions = async () => {
          try {
            const { getWithAuth } = await import("@/lib/api-helpers");
            const normalizedDataSourceId = typeof prop.linkedDatabaseId === "string" 
              ? prop.linkedDatabaseId 
              : String(prop.linkedDatabaseId);
            
            const response: any = await getWithAuth(
              `/api/database/getdataSource/${normalizedDataSourceId}`
            );
            
                  if (response?.success && response.collection?.notes) {
                    const notes = response.collection.notes || [];
                    // Store full note objects so we can display icon, title, and database properties
                    const options = notes.map((note: any) => ({
                      id: note._id || note.id || "",
                      name: note.title || "Untitled",
                      note: note, // Store full note object
                    }));
                    setRelationOptionsCache(prev => ({ ...prev, [selectedPropertyForOptions]: options }));
                  }
          } catch (error) {
            console.error("Failed to fetch relation options:", error);
          }
        };
        fetchRelationOptions();
      }
    }
  }, [selectedPropertyForOptions, boardProperties, relationOptionsCache]);

  const getOptionDisplay = (propId: string, optionName: string, optionId?: string) => {
    const prop = boardProperties[propId];
    if (!prop) return { name: optionName, color: "default", icon: null, note: null };

    if (prop.type === "person") {
      const member = workspaceMembers.find((m) => m.userName === optionName || m.userEmail === optionName);
      return { name: member?.userName || optionName, color: "default", icon: null, note: null };
    }

    if (prop.type === "relation" && optionId) {
      // Get full note from context or cache
      const cachedOption = relationOptionsCache[propId]?.find(opt => opt.id === optionId);
      const note = cachedOption?.note || getNoteById(optionId);
      
      if (note) {
        // Get current title from context (updates automatically)
        const linkedDatabaseId = prop.linkedDatabaseId || "";
        const currentTitle = getRelationNoteTitle(optionId, linkedDatabaseId, note.title || "Untitled");
        return { 
          name: currentTitle, 
          color: "default", 
          icon: note.icon || null,
          note: note // Full note object for displaying database properties
        };
      }
      
      return { name: optionName, color: "default", icon: null, note: null };
    }

    const option = prop.options?.find((opt: any) => opt.name === optionName);
    return {
      name: option?.name || optionName,
      color: option?.color || "default",
      icon: null,
      note: null,
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

  // Show all filters that have been added, even if they have no options selected yet
  const activeFilters = Object.entries(selectedFilters);
  
  // Get advanced filters from current view
  const getAdvancedFiltersFromView = (): any[] => {
    const viewTypeId = getCurrentViewTypeId(board._id);
    if (!viewTypeId) return [];
    
    const latestBoard = boards.find((b) => b._id === board._id) || board;
    const view = latestBoard.viewsType?.find((v) => {
      const vId = typeof v.id === "string" ? v.id : String(v.id);
      return vId === viewTypeId;
    });
    
    if (view?.settings && 'advancedFilters' in view.settings) {
      const advancedFilters = (view.settings as any).advancedFilters;
      if (Array.isArray(advancedFilters) && advancedFilters.length > 0) {
        return advancedFilters;
      }
    }
    return [];
  };
  
  const advancedFiltersFromView = getAdvancedFiltersFromView();
  const advancedFilterRules = convertAdvancedFiltersToRules(advancedFiltersFromView);
  const normalFilterCount = activeFilters.length;
  const advancedFilterBlockCount = advancedFilterRules.length > 0 ? 1 : 0;
  const totalFilterCount = normalFilterCount + advancedFilterBlockCount;

  const renderOptionModal = (propId: string) => {
    const prop = boardProperties[propId];
    const options = getPropertyOptions(propId);
    const selectedOptions = selectedFilters[propId] || [];
    const normalizedRollupCalc =
      prop?.type === "rollup" ? normalizeCalculation(prop.rollup?.calculation) : null;
    const rollupNeedsInput =
      prop?.type === "rollup" && normalizedRollupCalc && normalizedRollupCalc.category !== "original";
    const rollupInputValue = rollupInputValues[propId] ?? "";

    const handleRollupInputSubmit = () => {
      const trimmed = rollupInputValue.trim();
      if (!trimmed) return;
      handleOptionToggle(propId, trimmed);
      setRollupInputValues((prev) => ({ ...prev, [propId]: "" }));
    };

    const handleRollupInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleRollupInputSubmit();
      }
    };

    if (rollupNeedsInput) {
      return (
        <div className="p-3 space-y-3">
          <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900 flex items-center gap-2">
            <input
              type="text"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-gray-100"
              value={rollupInputValue}
              onChange={(e) => setRollupInputValues((prev) => ({ ...prev, [propId]: e.target.value }))}
              onKeyDown={handleRollupInputKeyDown}
              placeholder="Type a value…"
            />
            {rollupInputValue && (
              <button
                type="button"
                onClick={() => setRollupInputValues((prev) => ({ ...prev, [propId]: "" }))}
                className="h-6 w-6 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                aria-label="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {selectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleOptionToggle(propId, value)}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {value}
                  <span className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-100">×</span>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
            <button
              onClick={() => handleClearSelection(propId)}
              className="w-full rounded px-2 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Clear selection
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="flex-shrink-0">
          <div className="p-1 pt-0">
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="truncate">{capitalize(prop?.name || "")} is </span>
              <div className="flex items-center gap-1">
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
            <div className="flex-1"></div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-0 pb-1">
              {options.map((opt: any) => {
                const isSelected = selectedOptions.includes(opt.name);
                const display = getOptionDisplay(propId, opt.name, opt.id);
                const color = display.color || "default";
                const note = display.note || opt.note;

                return (
                  <div
                    key={opt.id || opt.name}
                    role="menuitem"
                    tabIndex={-1}
                    className={`flex items-center gap-2 px-4 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${
                      isSelected ? "bg-gray-100 dark:bg-gray-800" : ""
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
                      {prop?.type !== "status" && prop?.type !== "priority" && prop?.type !== "relation" && prop?.type !== "rollup" && (
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {capitalize(display.name)}
                        </span>
                      )}
                      {prop?.type === "rollup" && (
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {display.name}
                        </span>
                      )}
                      {prop?.type === "relation" && (
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Note Icon */}
                          {note?.icon && (
                            <span className="text-base flex-shrink-0" style={{ fontSize: '18px' }}>
                              {note.icon}
                            </span>
                          )}
                          {!note?.icon && (
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          {/* Note Title */}
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0">
                            {capitalize(display.name)}
                          </span>
                          {/* Show first database property value if available */}
                          {note && note.databaseProperties && Object.keys(note.databaseProperties).length > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                              {(() => {
                                const propKeys = Object.keys(note.databaseProperties);
                                if (propKeys.length === 0) return "";
                                const firstPropKey = propKeys[0];
                                if (!firstPropKey) return "";
                                const firstPropValue = note.databaseProperties[firstPropKey];
                                if (Array.isArray(firstPropValue)) {
                                  return firstPropValue.slice(0, 1).join(", ");
                                }
                                return String(firstPropValue || "").slice(0, 20);
                              })()}
                            </span>
                          )}
                        </div>
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


  return (
    <div
      ref={modalRef}
      className="flex flex-col h-full max-h-[80vh] pt-0 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-sm relative"
      style={{ 
        zIndex: 50,
        minWidth: "290px",
        maxWidth: "calc(100vw - 24px)"
      }}
    >
      <div className="flex-shrink-0">
        <DropdownMenuHeader
          title={mode === "add" ? "Add filter" : `Filters${totalFilterCount > 0 ? ` (${totalFilterCount})` : ""}`}
          onBack={onClose}
          onClose={onClose}
          showBack={true}
          showClose={true}
        />
      </div>

      <div className="flex-1 min-h-0">
        {mode === "add" ? (
          <>
            <div className="p-2 pt-1">
              <DropdownMenuSearch
                placeholder="Filter by…"
                value={search}
                onChange={setSearch}
                autoFocus={true}
              />
            </div>
            <div className="p-1 relative">
              {(() => {
                const menuItems: DropdownMenuItemProps[] = filteredProperties.map(([id, prop]) => {
                  const Icon = getPropertyIcon(prop.type);
                  return {
                    id,
                    label: capitalize(prop.name),
                    icon: Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : undefined,
                    onClick: () => handlePropertySelect(id),
                  };
                });

                // Add Advanced filter button at the end
                const advancedFilterItem: DropdownMenuItemProps = {
                  id: "advanced-filter",
                  label: "Advanced filter",
                  icon: <ChevronDown className="h-4 w-4 text-muted-foreground" />,
                  onClick: () => setShowAdvancedFilter(true),
                };

                // Add divider before advanced filter if there are properties
                const dividerAfter = menuItems.length > 0 ? [menuItems.length - 1] : [];
                const allMenuItems = [...menuItems, advancedFilterItem];

                return (
                  <div className="relative">
                    <DropdownMenu items={allMenuItems} dividerAfter={dividerAfter} />
                    {selectedPropertyForOptions && showOptionModal && (
                      <div
                        ref={optionModalRef}
                        className="absolute left-0 top-full mt-1 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg z-[100]"
                        style={{
                          width: "260px",
                          minWidth: "180px",
                          maxWidth: "calc(100vw - 24px)",
                          maxHeight: "50vh",
                        }}
                      >
                        {renderOptionModal(selectedPropertyForOptions)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        ) : (
          <div style={{ padding: "4px", display: "flex", flexDirection: "column", gap: "1px" }}>
            <div>
              {activeFilters.map(([propId, values]) => {
                const prop = boardProperties[propId];
                if (!prop) return null;
                const Icon = getPropertyIcon(prop.type);
                const isOpen = selectedPropertyForOptions === propId && showOptionModal;

                return (
                  <div key={propId} className="relative" style={{ display: "flex", flexDirection: "column", cursor: "grab" }}>
                    <div className="flex items-center" style={{ padding: "4px 10px" }}>
                      <div 
                        className="flex items-center justify-center cursor-grab flex-shrink-0"
                        style={{ 
                          width: "18px",
                          height: "24px",
                        }}
                      >
                        <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div data-popup-origin="true" style={{ display: "contents" }}>
                        <div style={{ borderRadius: "14px", marginInlineEnd: "6px", display: "inline-flex" }}>
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
                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                            style={{
                              fontSize: "14px",
                              borderRadius: "32px",
                              height: "24px",
                              lineHeight: "24px",
                              padding: "0px 8px"
                            }}
                            type="button"
                            aria-expanded={isOpen}
                            aria-haspopup="dialog"
                          >
                            {Icon && (
                              <div 
                                className="flex items-center justify-center flex-shrink-0"
                                style={{ 
                                  width: "16px",
                                  height: "16px"
                                }}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                            )}
                            <span className="truncate" style={{ maxWidth: "180px" }}>
                              {capitalize(prop.name)}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {isOpen && (
                      <div
                        ref={optionModalRef}
                        className="absolute left-0 top-full mt-1 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg z-[100]"
                        style={{
                          width: "260px",
                          minWidth: "180px",
                          maxWidth: "calc(100vw - 24px)",
                          maxHeight: "50vh",
                        }}
                      >
                        {renderOptionModal(propId)}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Advanced Filter Summary */}
              {advancedFilterRules.length > 0 && (
                <div className="relative" style={{ display: "flex", flexDirection: "column" }}>
                  <div className="flex items-center" style={{ padding: "4px 10px" }}>
                    <div 
                      className="flex items-center justify-center flex-shrink-0"
                      style={{ 
                        width: "18px",
                        height: "24px",
                      }}
                    >
                        <ListFilter className="h-4 w-4 text-gray-400 dark:text-gray-500" /> 
                    </div>
                    <div data-popup-origin="true" style={{ display: "contents" }}>
                      <div style={{ borderRadius: "14px", marginInlineEnd: "6px", display: "inline-flex", width: "100%" }}>
                        <button
                          onClick={() => setShowAdvancedFilter(true)}
                          className="flex-1 inline-flex items-center justify-between gap-2 whitespace-nowrap transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-full"
                          type="button"
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {advancedFilterRules.length} {advancedFilterRules.length === 1 ? "rule" : "rules"}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleAddFilter}
                className="w-full flex items-center transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-600 dark:text-gray-400"
                style={{ 
                  borderRadius: "6px",
                  lineHeight: "120%",
                  minHeight: "28px",
                  fontSize: "14px",
                  paddingInline: "8px"
                }}
                type="button"
              >
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: "20px", height: "20px", marginRight: "6px" }}>
                  <Plus className="w-4 h-4" />
                </div>
                <span className="truncate whitespace-nowrap">Add filter</span>
              </button>
              
              {/* Advanced filter button */}
              {advancedFilterRules.length === 0 && (
                <div style={{ marginTop: "1px", position: "relative" }}>
                  <div className="absolute top-0 left-3 right-3 h-px bg-gray-200 dark:bg-gray-700"></div>
                  <button
                    onClick={() => setShowAdvancedFilter(true)}
                    className="w-full flex items-center gap-2 transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-600 dark:text-gray-400"
                    style={{ 
                      borderRadius: "6px",
                      lineHeight: "120%",
                      minHeight: "28px",
                      fontSize: "14px",
                      paddingInline: "8px"
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-center flex-shrink-0" style={{ width: "20px", height: "20px" }}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                    <span className="truncate whitespace-nowrap flex-1 text-left">Advanced filter</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Advanced Filter Modal */}
      {showAdvancedFilter && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 dark:bg-black/40"
          onClick={(e) => {
            // Close when clicking on the backdrop
            if (e.target === e.currentTarget) {
              setShowAdvancedFilter(false);
            }
          }}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <AdvancedFilterModal
              board={board}
              boardProperties={boardProperties}
              onClose={() => setShowAdvancedFilter(false)}
              initialRules={(() => {
                // Load existing advanced filters from current view
                const viewTypeId = getCurrentViewTypeId(board._id);
                if (!viewTypeId) return [];
                
                const latestBoard = boards.find((b) => b._id === board._id) || board;
                const view = latestBoard.viewsType?.find((v) => {
                  const vId = typeof v.id === "string" ? v.id : String(v.id);
                  return vId === viewTypeId;
                });
                
                if (view?.settings && 'advancedFilters' in view.settings) {
                  const advancedFilters = (view.settings as any).advancedFilters;
                  if (Array.isArray(advancedFilters) && advancedFilters.length > 0) {
                    return convertAdvancedFiltersToRules(advancedFilters);
                  }
                }
                return [];
              })()}
              onApply={async (rules) => {
                console.log("Advanced filter onApply called with rules:", rules);

                const viewTypeId = getCurrentViewTypeId(board._id);
                if (!viewTypeId) {
                  toast.error("View type ID not found");
                  return;
                }

                const latestBoard = boards.find((b) => b._id === board._id) || board;
                const previousBoard = latestBoard;

                try {
                  console.log("Calling updateAdvancedFilters with viewTypeId:", viewTypeId, "rules:", rules);
                  
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
                  
                  // Save advanced filters to backend
                  const res = await updateAdvancedFilters(viewTypeId, groups);
                  
                  console.log("updateAdvancedFilters response:", res);

                  if (res.viewType) {
                    // Update board's viewType settings in context with server response
                    const updatedViewsType = latestBoard.viewsType.map((v) => {
                      const vId = typeof v.id === "string" ? v.id : String(v.id);
                      return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
                    });
                    updateBoard(board._id, { ...latestBoard, viewsType: updatedViewsType });
                    
                    // Update advanced filters in context
                    const settings = res.viewType?.settings as any;
                    const advancedFiltersFromResponse = settings?.advancedFilters || [];
                    setAdvancedFilters(viewTypeId, advancedFiltersFromResponse);
                  }
                  
                  toast.success("Advanced filters updated successfully");
                  setShowAdvancedFilter(false);
                  onClose(); // Close the main filter modal as well
                } catch (err) {
                  console.error("Failed to update advanced filters:", err);
                  toast.error(err instanceof Error ? err.message : "Failed to update advanced filters");
                  // Don't close modal on error so user can retry
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
