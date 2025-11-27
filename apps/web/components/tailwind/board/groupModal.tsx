"use client";

import { useBoard } from "@/contexts/boardContext";
import type { BoardProperty, ViewCollection } from "@/types/board";
import { ChevronRight, EyeOff, GripVertical, Pin, Check } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { updateGroup, updateGroupByPropertyId } from "@/services-frontend/boardServices/databaseSettingsService";
import { toast } from "sonner";
import GroupByPropertiesModal from "./groupByPropertiesModal";
import { getColorStyles } from "@/utils/colorStyles";
import { DropdownMenuHeader, DropdownMenu, DropdownMenuDivider, DropdownMenuToggle } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

interface GroupModalProps {
  board: ViewCollection;
  boardProperties: Record<string, BoardProperty>;
  onClose: () => void;
}

export default function GroupModal({ board, boardProperties, onClose }: GroupModalProps) {
  const boardId = board._id;
  const modalRef = useRef<HTMLDivElement>(null);
  const statusByDropdownRef = useRef<HTMLDivElement>(null);
  const [showGroupBySelector, setShowGroupBySelector] = useState(false);
  const [showStatusBySelector, setShowStatusBySelector] = useState(false);
  const [showSortSelector, setShowSortSelector] = useState(false);
  
  const { 
    groupBy, 
    getGroupBy,
    setGroupBy,
    currentView, 
    boards, 
    updateBoard,
    getNotesByDataSourceId,
    getCurrentDataSource
  } = useBoard();
  
  const latestBoard = boards.find((b) => b._id === boardId) || board;
  const currentViewData = currentView[boardId];
  
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
    
    return view?.id ? (typeof view.id === "string" ? view.id : String(view.id)) : null;
  };
  
  const viewTypeId = getCurrentViewTypeId();
  
  const currentViewObj = latestBoard.viewsType?.find((v) => {
    if (!currentViewData) return false;
    if (v.id && currentViewData.id && v.id === currentViewData.id) return true;
    if (v.viewType === currentViewData.type) return true;
    return false;
  });
  
  const currentGroupByFromContext = viewTypeId ? getGroupBy(boardId) : undefined;
  const currentGroupByFromSettings = currentViewObj?.settings?.group?.propertyId;
  const currentGroupBy = currentGroupByFromContext || currentGroupByFromSettings;
  const currentGroupProperty = currentGroupBy ? boardProperties[currentGroupBy] : undefined;
  
  const hasOptions = currentGroupProperty?.options && Array.isArray(currentGroupProperty.options) && currentGroupProperty.options.length > 0;
  
  const currentDataSource = getCurrentDataSource(boardId);
  const dataSourceId = currentDataSource?._id;
  const notes = dataSourceId ? getNotesByDataSourceId(dataSourceId) : [];
  
  const groupSettings = currentViewObj?.settings?.group;
  const hideEmptyGroups = groupSettings?.hideEmptyGroups ?? false;
  const colorColumns = groupSettings?.colotColumn ?? false;
  const sortDirection = groupSettings?.sortDirection ?? "ascending";
  
  const [localHideEmptyGroups, setLocalHideEmptyGroups] = useState(hideEmptyGroups);
  const [localColorColumns, setLocalColorColumns] = useState(colorColumns);
  const [localSortDirection, setLocalSortDirection] = useState<"ascending" | "descending">(sortDirection);
  
  const groupSettingsKey = useMemo(() => {
    const groupSettings = currentViewObj?.settings?.group;
    if (!groupSettings) return null;
    return JSON.stringify({
      propertyId: groupSettings.propertyId,
      hideEmptyGroups: groupSettings.hideEmptyGroups ?? false,
      colotColumn: groupSettings.colotColumn ?? false,
      sortDirection: groupSettings.sortDirection ?? "ascending",
    });
  }, [currentViewObj?.settings?.group]);
  
  const prevGroupSettingsKeyRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (groupSettingsKey === prevGroupSettingsKeyRef.current) {
      return;
    }
    
    prevGroupSettingsKeyRef.current = groupSettingsKey;
    
    const groupSettings = currentViewObj?.settings?.group;
    if (groupSettings) {
      setLocalHideEmptyGroups(groupSettings.hideEmptyGroups ?? false);
      setLocalColorColumns(groupSettings.colotColumn ?? false);
      setLocalSortDirection(groupSettings.sortDirection ?? "ascending");
    } else {
      setLocalHideEmptyGroups(false);
      setLocalColorColumns(false);
      setLocalSortDirection("ascending");
    }
  }, [groupSettingsKey, currentViewObj?.settings?.group]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        modalRef.current && 
        !modalRef.current.contains(target) &&
        !statusByDropdownRef.current?.contains(target)
      ) {
        onClose();
      }
      if (
        statusByDropdownRef.current &&
        !statusByDropdownRef.current.contains(target) &&
        !modalRef.current?.contains(target)
      ) {
        setShowStatusBySelector(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);
  
  const handleGroupBySelect = async (propId: string) => {
    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }
    
    // Store previous state for rollback
    const previousGroupBy = currentGroupBy;
    const previousBoard = latestBoard;
    
    // Optimistic update: update context first
    setGroupBy(viewTypeId, propId);
    const optimisticViewsType = latestBoard.viewsType.map((v) => {
      const vId = typeof v.id === "string" ? v.id : String(v.id);
      if (vId === viewTypeId) {
        return {
          ...v,
          settings: {
            ...v.settings,
            group: {
              propertyId: propId,
              sortDirection: "ascending" as const,
              hideEmptyGroups: false,
              colotColumn: false,
            },
          },
        };
      }
      return v;
    });
    updateBoard(boardId, { ...latestBoard, viewsType: optimisticViewsType });
    setShowGroupBySelector(false);
    
    try {
      const res = await updateGroupByPropertyId(viewTypeId, propId);
      
      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(boardId, { ...latestBoard, viewsType: updatedViewsType });
      }
      
      toast.success("Group by updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update group by");
      // Rollback on error
      setGroupBy(viewTypeId, previousGroupBy);
      updateBoard(boardId, previousBoard);
    }
  };
  
  const handleClearGroupBy = async () => {
    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }
    
    // Store previous state for rollback
    const previousGroupBy = currentGroupBy;
    const previousBoard = latestBoard;
    
    // Optimistic update: update context first
    setGroupBy(viewTypeId, undefined);
    const optimisticViewsType = latestBoard.viewsType.map((v) => {
      const vId = typeof v.id === "string" ? v.id : String(v.id);
      if (vId === viewTypeId) {
        return {
          ...v,
          settings: {
            ...v.settings,
            group: undefined,
          },
        };
      }
      return v;
    });
    updateBoard(boardId, { ...latestBoard, viewsType: optimisticViewsType });
    
    try {
      const res = await updateGroup(viewTypeId, null);
      
      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(boardId, { ...latestBoard, viewsType: updatedViewsType });
      }
      
      toast.success("Group by cleared");
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear group by");
      // Rollback on error
      setGroupBy(viewTypeId, previousGroupBy);
      updateBoard(boardId, previousBoard);
    }
  };
  
  const handleToggleHideEmptyGroups = async () => {
    if (!viewTypeId || !currentGroupBy) return;
    
    const newValue = !localHideEmptyGroups;
    const previousValue = localHideEmptyGroups;
    const previousBoard = latestBoard;
    
    // Optimistic update: update context first
    setLocalHideEmptyGroups(newValue);
    const optimisticViewsType = latestBoard.viewsType.map((v) => {
      const vId = typeof v.id === "string" ? v.id : String(v.id);
      if (vId === viewTypeId) {
        return {
          ...v,
          settings: {
            ...v.settings,
            group: {
              propertyId: currentGroupBy,
              sortDirection: localSortDirection,
              hideEmptyGroups: newValue,
              colotColumn: localColorColumns,
            },
          },
        };
      }
      return v;
    });
    updateBoard(boardId, { ...latestBoard, viewsType: optimisticViewsType });
    
    try {
      const res = await updateGroup(
        viewTypeId,
        {
          propertyId: currentGroupBy,
          sortDirection: localSortDirection,
          hideEmptyGroups: newValue,
          colotColumn: localColorColumns,
        }
      );
      
      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(boardId, { ...latestBoard, viewsType: updatedViewsType });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update setting");
      // Rollback on error
      setLocalHideEmptyGroups(previousValue);
      updateBoard(boardId, previousBoard);
    }
  };
  
  const handleSortDirectionChange = async (direction: "ascending" | "descending") => {
    if (!viewTypeId || !currentGroupBy) return;
    
    const previousDirection = localSortDirection;
    const previousBoard = latestBoard;
    
    // Optimistic update: update context first
    setLocalSortDirection(direction);
    setShowSortSelector(false);
    const optimisticViewsType = latestBoard.viewsType.map((v) => {
      const vId = typeof v.id === "string" ? v.id : String(v.id);
      if (vId === viewTypeId) {
        return {
          ...v,
          settings: {
            ...v.settings,
            group: {
              propertyId: currentGroupBy,
              sortDirection: direction,
              hideEmptyGroups: localHideEmptyGroups,
              colotColumn: localColorColumns,
            },
          },
        };
      }
      return v;
    });
    updateBoard(boardId, { ...latestBoard, viewsType: optimisticViewsType });
    
    try {
      const res = await updateGroup(
        viewTypeId,
        {
          propertyId: currentGroupBy,
          sortDirection: direction,
          hideEmptyGroups: localHideEmptyGroups,
          colotColumn: localColorColumns,
        }
      );
      
      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(boardId, { ...latestBoard, viewsType: updatedViewsType });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update sort direction");
      // Rollback on error
      setLocalSortDirection(previousDirection);
      updateBoard(boardId, previousBoard);
    }
  };
  
  const getOptionColor = (optionName: string) => {
    if (!currentGroupProperty?.options) return "default";
    const option = currentGroupProperty.options.find((opt: any) => opt.name === optionName);
    return option?.color || "default";
  };
  
  
  const getGroups = () => {
    if (!currentGroupBy || !currentGroupProperty) return [];
    
    const groups: Record<string, { items: any[]; option?: any }> = {};
    
    notes.forEach((note) => {
      let groupValue = note.databaseProperties?.[currentGroupBy];
      let option: any = null;
      
      if (currentGroupProperty.type === "person" && Array.isArray(groupValue)) {
        if (groupValue.length === 0) {
          groupValue = "Unassigned";
        } else {
          const firstPerson = groupValue[0];
          groupValue = firstPerson.userName || firstPerson.userEmail || "Unnamed User";
        }
      } else if (currentGroupProperty.options && Array.isArray(currentGroupProperty.options)) {
        option = currentGroupProperty.options.find((opt: any) => opt.name === groupValue) || null;
      }
      
      const groupKey = groupValue ? String(groupValue) : "No " + (currentGroupProperty?.name || "Group");
      
      if (!groups[groupKey]) {
        groups[groupKey] = { items: [], option: option || null };
      }
      groups[groupKey]?.items.push(note);
    });
    
    return Object.entries(groups).map(([name, data]) => ({
      name,
      items: data.items,
      count: data.items.length,
      option: data.option,
    }));
  };
  
  const groups = getGroups();
  
  // Build menu items array
  const menuItems: DropdownMenuItemProps[] = useMemo(() => {
    const items: DropdownMenuItemProps[] = [];
    
    // Group by item
    items.push({
      id: 'group-by',
      label: "Group by",
      onClick: () => setShowGroupBySelector(true),
      hasChevron: true,
      count: currentGroupProperty?.name
        ? currentGroupProperty.name[0]?.toUpperCase() + currentGroupProperty.name.slice(1)
        : "None",
    });
    
    // {Property} by item (conditional)
    if (currentGroupBy && currentGroupProperty) {
      items.push({
        id: 'property-by',
        label: `${currentGroupProperty.name[0]?.toUpperCase() + currentGroupProperty.name.slice(1)} by`,
        onClick: () => setShowStatusBySelector(!showStatusBySelector),
        hasChevron: true,
        count: "Option",
      });
    }
    
    // Sort item (conditional)
    if (hasOptions) {
      items.push({
        id: 'sort',
        label: "Sort",
        onClick: () => setShowSortSelector(!showSortSelector),
        hasChevron: true,
        count: localSortDirection ? localSortDirection.charAt(0).toUpperCase() + localSortDirection.slice(1) : "None",
      });
    }
    
    // Hide empty groups with toggle
    items.push({
      id: 'hide-empty-groups',
      label: "Hide empty groups",
      onClick: () => {},
      rightElement: (
        <DropdownMenuToggle
          checked={localHideEmptyGroups}
          onChange={handleToggleHideEmptyGroups}
        />
      ),
    });
    
    return items;
  }, [
    currentGroupBy,
    currentGroupProperty,
    hasOptions,
    localSortDirection,
    localHideEmptyGroups,
    handleToggleHideEmptyGroups,
    setShowGroupBySelector,
    setShowStatusBySelector,
    setShowSortSelector,
  ]);
  
  if (showGroupBySelector) {
    return (
      <GroupByPropertiesModal
        board={board}
        boardProperties={boardProperties}
        selectedPropertyId={currentGroupBy}
        onClose={() => setShowGroupBySelector(false)}
        onSelect={handleGroupBySelect}
      />
    );
  }
  
  return (
    <div
      ref={modalRef}
      className="flex flex-col min-w-[290px] max-w-[290px] h-full max-h-[80vh] pt-0 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-sm overflow-visible relative"
      style={{ zIndex: 50 }}
    >
      <div className="flex-shrink-0">
        <DropdownMenuHeader
          title="Group"
          onBack={onClose}
          onClose={onClose}
          showBack={true}
          showClose={true}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-1">
          <div className="relative">
            <DropdownMenu items={menuItems} />
            
            {/* Status by dropdown */}
            {currentGroupBy && currentGroupProperty && showStatusBySelector && (
              <div
                ref={statusByDropdownRef}
                className="absolute left-0 top-full mt-1 w-full bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg z-[100]"
                style={{ zIndex: 100 }}
              >
                <div className="p-1">
                  <div className="flex items-center px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Check className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                    <span>Option</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Sort dropdown */}
            {hasOptions && showSortSelector && (
              <div 
                className="absolute left-0 top-full mt-1 w-full bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg z-[100]"
                style={{ zIndex: 100 }}
              >
                <DropdownMenu
                  items={[
                    {
                      id: 'ascending',
                      label: "Ascending",
                      onClick: () => handleSortDirectionChange("ascending"),
                    },
                    {
                      id: 'descending',
                      label: "Descending",
                      onClick: () => handleSortDirectionChange("descending"),
                    },
                  ]}
                />
              </div>
            )}
          </div>
          
          <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-2 py-1.5 mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Groups</span>
              <button
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-1.5 py-0.5"
                type="button"
              >
                Show all
              </button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {groups.map((group) => {
                const color = group.option ? getOptionColor(group.name) : "default";
                const colors = getColorStyles(color);
                
                if (!colors) return null;
                
                return (
                  <div
                    key={group.name}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-grab"
                    draggable
                  >
                    <div className="flex items-center justify-center w-[18px] h-6 cursor-grab">
                      <GripVertical className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 -ml-0.5">
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
                          />
                          <span className="truncate opacity-100">{group.name[0]?.toUpperCase() + group.name.slice(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        type="button"
                        aria-label="Pin group"
                      >
                        <Pin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        type="button"
                        aria-label="Show group"
                      >
                        <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mt-1 pt-1">
            <DropdownMenuDivider />
            <DropdownMenu
              items={[
                {
                  id: 'clear-group-by',
                  label: "Clear Group By",
                  onClick: handleClearGroupBy,
                  disabled: !currentGroupBy,
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

