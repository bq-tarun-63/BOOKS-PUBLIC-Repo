"use client";

import BoardToolbar from "@/components/tailwind/board/boardToolbar";
import BoardView from "@/components/tailwind/board/boardView/boardView";
import { useBoard } from "@/contexts/boardContext";
import { postWithAuth, getWithAuth } from "@/lib/api-helpers";
import type { ViewCollection } from "@/types/board";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import AddViewDialog from "./addViewDialog";
import CalendarView from "./calendarView/calenderView";
import ListView from "./listView/listView";
import TimelineView from "./timelineView/timelineView";
import FormView from "./formView/formView";
import FiltersAndSortsBar from "./filtersAndSortsBar";
interface BoardContainerProps {
  readonly boardId: string;
}

export default function BoardContainer({boardId}: BoardContainerProps) {

  const [isDialogOpen , setIsDialogOpen ] = useState<boolean>(false);
  const { 
    boards, 
    getNotesByDataSourceId, 
    updateBoard, 
    currentView, 
    setCurrentView, 
    setDataSource,
    setBoardFilters,
    setAdvancedFilters,
    setBoardSortBy,
    setGroupBy,
    setPropertyVisibility,
    getCurrentDataSourceProperties
  } = useBoard();
  const board = boards.find((b) => b._id === boardId);
  const loadedSettingsRef = useRef<Set<string>>(new Set());
  
  const currentViewData = currentView[boardId];
  const currentViewId = currentViewData?.id;
  
  // IMPORTANT: Always match by view ID first, only use type as fallback
  let currentViewObj;
  if (currentViewId) {
    // Prioritize ID match - if currentViewId exists, ONLY match by ID
    currentViewObj = board?.viewsType?.find((v) => v.id === currentViewId);
  } else if (currentViewData?.type) {
    // Only fallback to type if no ID is available
    currentViewObj = board?.viewsType?.find((v) => v.viewType === currentViewData.type);
  }
  
  const boardView = currentViewObj?.viewType || currentViewData?.type || board?.viewsType?.[0]?.viewType || "board";
  const actualCurrentViewId = currentViewObj?.id || currentViewId || board?.viewsType?.[0]?.id;
  
  // Get dataSourceId from current view
  const currentDataSourceId = currentViewObj?.databaseSourceId;
  
  // Normalize currentDataSourceId to string
  const normalizedCurrentDataSourceId = currentDataSourceId 
    ? (typeof currentDataSourceId === "string" ? currentDataSourceId : String(currentDataSourceId))
    : null;
  
  // Get notes by dataSourceId from context
  const boardNotes = normalizedCurrentDataSourceId 
    ? getNotesByDataSourceId(normalizedCurrentDataSourceId)
    : []; // If no dataSourceId, show no notes


  useEffect(() => {
    if (!board || !board.viewsType) return;
    
    // Process all views including the first one
    board.viewsType.forEach((view, index) => {
      if (!view.id) return;
      
      const viewTypeId = typeof view.id === "string" ? view.id : String(view.id);
      const settingsKey = `${boardId}-${viewTypeId}`;
      
      if (loadedSettingsRef.current.has(settingsKey)) {
        return;
      }
      
      if (view.settings && Object.keys(view.settings).length > 0) {
        loadedSettingsRef.current.add(settingsKey);
        
        if (view.settings.filters && Array.isArray(view.settings.filters) && view.settings.filters.length > 0) {
          const filtersMap: Record<string, string[]> = {};
          view.settings.filters.forEach((filter: any) => {
            // Skip advanced filters - they're handled separately from settings
            if (filter.isAdvanced) {
              return;
            }
            if (!filtersMap[filter.propertyId]) {
              filtersMap[filter.propertyId] = [];
            }
            if (Array.isArray(filter.value)) {
              filtersMap[filter.propertyId] = filter.value;
            } else if (filter.value !== undefined && filter.value !== null) {
              filtersMap[filter.propertyId] = [filter.value];
            }
          });
          setBoardFilters(viewTypeId, filtersMap);
        }
        
        // Load advanced filters
        const settings = view.settings as any;
        if (settings?.advancedFilters && Array.isArray(settings.advancedFilters)) {
          setAdvancedFilters(viewTypeId, settings.advancedFilters);
        } else {
          setAdvancedFilters(viewTypeId, []);
        }
        
        if (view.settings.sorts && Array.isArray(view.settings.sorts) && view.settings.sorts.length > 0) {
          const newSorts = view.settings.sorts.map((s: any) => ({
            propertyId: s.propertyId,
            direction: s.direction,
          }));
          setBoardSortBy(viewTypeId, newSorts);
        }
        
        if (view.settings.group && view.settings.group.propertyId) {
          setGroupBy(viewTypeId, view.settings.group.propertyId);
        }
        
        if (view.settings.propertyVisibility && Array.isArray(view.settings.propertyVisibility)) {
          const newVisibility = view.settings.propertyVisibility.map((pv: any) => 
            typeof pv === 'string' ? pv : pv.propertyId
          );
          setPropertyVisibility(viewTypeId, newVisibility);
        }
      } else {
        // Mark as loading before making the API call to prevent duplicate calls
        loadedSettingsRef.current.add(settingsKey);
        
        (async () => {
          try {
            const res = await getWithAuth(`/api/database/settings/get/${viewTypeId}`) as {
              success?: boolean;
              viewType?: {
                _id?: string;
                settings?: any;
                isLocked?: boolean;
              };
            };
            
            if (res?.success && res.viewType?.settings) {
              if (res.viewType.settings.filters && Array.isArray(res.viewType.settings.filters) && res.viewType.settings.filters.length > 0) {
                const filtersMap: Record<string, string[]> = {};
                res.viewType.settings.filters.forEach((filter: any) => {
                  // Skip advanced filters - they're handled separately
                  if (filter.isAdvanced) {
                    return;
                  }
                  if (!filtersMap[filter.propertyId]) {
                    filtersMap[filter.propertyId] = [];
                  }
                  if (Array.isArray(filter.value)) {
                    filtersMap[filter.propertyId] = filter.value;
                  } else if (filter.value !== undefined && filter.value !== null) {
                    filtersMap[filter.propertyId] = [filter.value];
                  }
                });
                setBoardFilters(viewTypeId, filtersMap);
              }
              
              // Load advanced filters from API response
              const apiSettings = res.viewType.settings as any;
              if (apiSettings?.advancedFilters && Array.isArray(apiSettings.advancedFilters)) {
                setAdvancedFilters(viewTypeId, apiSettings.advancedFilters);
              } else {
                setAdvancedFilters(viewTypeId, []);
              }
              
              if (res.viewType.settings.sorts && Array.isArray(res.viewType.settings.sorts) && res.viewType.settings.sorts.length > 0) {
                const newSorts = res.viewType.settings.sorts.map((s: any) => ({
                  propertyId: s.propertyId,
                  direction: s.direction,
                }));
                setBoardSortBy(viewTypeId, newSorts);
              }
              
              if (res.viewType.settings.group && res.viewType.settings.group.propertyId) {
                setGroupBy(viewTypeId, res.viewType.settings.group.propertyId);
              }
              
              if (res.viewType.settings.propertyVisibility && Array.isArray(res.viewType.settings.propertyVisibility)) {
                const newVisibility = res.viewType.settings.propertyVisibility.map((pv: any) => 
                  typeof pv === 'string' ? pv : pv.propertyId
                );
                setPropertyVisibility(viewTypeId, newVisibility);
              }
            }
          } catch (err) {
            console.error(`Failed to fetch settings for viewTypeId ${viewTypeId} (index ${index}):`, err);
          }
        })();
      }
    });
  }, [boardId, board, setBoardFilters, setAdvancedFilters, setBoardSortBy, setGroupBy, setPropertyVisibility]);

  useEffect(() => {
    const currentViewData = currentView[boardId];
    if (!currentViewData && board?.viewsType?.[0]) {
      const firstView = board.viewsType[0];
      const viewId = firstView.id ? (typeof firstView.id === "string" ? firstView.id : String(firstView.id)) : "";
      setCurrentView(boardId, viewId, firstView.viewType);
    }
  }, [boardId, currentView, board?.viewsType, setCurrentView]);

  const handleAddView = async (view: "board" | "list" | "calendar" | "timeline" | "forms") => {
    // ✅ optimistic update
    if (!board) return;
    const updatedBoard: ViewCollection = { ...board, viewsType: [...(board.viewsType || []), { viewType: view, title: view.charAt(0).toUpperCase() + view.slice(1), icon: "" }] };
    updateBoard(boardId, updatedBoard);

    setCurrentView(boardId, "", view);
    setIsDialogOpen(false);

    try {
      // ✅ backend update
      const res = await postWithAuth(`/api/database/addViewType`, {
        viewId: boardId,
        viewTypes: updatedBoard.viewsType,
        typeToAdd: view,
      });

      if (!res.view.success) {
        console.error("Error in creating the View ");
        toast.error("Failed to create view !");
        updateBoard(boardId, board);
        // Set currentView with id and type
        const firstView = board.viewsType?.[0];
        if (firstView) {
          setCurrentView(boardId, firstView.id || "", firstView.viewType);
        }
        return;
      }
      
      if (res.view.view) {
        const updatedViewsType = (res.view.view.viewsType || []).map((vt: any) => {
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
            isPublicForm: vt.isPublicForm,
            formAnonymousResponses: vt.formAnonymousResponses,
            formAccessToSubmission: vt.formAccessToSubmission,
            databaseSourceId: databaseSourceId,
            settings: vt.settings || {}, // Preserve settings from API response
            isLocked: vt.isLocked || false, // Preserve isLocked if present
          };
        });
        
        // Update only viewsType in board context
        const updatedBoard: ViewCollection = {
          ...board,
          viewsType: updatedViewsType,
        };
        
        updateBoard(boardId, updatedBoard);
        
        // Find the newly added view by viewType and set it as current (prefer id)
        const newView = updatedViewsType.find(
          (v) => v.viewType === view && !board.viewsType?.some(bv => bv.id === v.id)
        );
        

        // Fetch and store data sources for all views that have databaseSourceId
        const dataSourceIds = new Set<string>();
        updatedViewsType.forEach((v) => {
          if (v.databaseSourceId) {
            dataSourceIds.add(v.databaseSourceId);
          }
        });
        
        // Fetch all data sources in parallel
        const dataSourcePromises = Array.from(dataSourceIds).map(async (dsId) => {
          try {
            const dataSourceRes = await getWithAuth(`/api/database/getdataSource/${dsId}`) as { success?: boolean; collection?: { dataSource?: any } };
            if (dataSourceRes.success && dataSourceRes.collection?.dataSource) {
              const ds = dataSourceRes.collection.dataSource;
              const id = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : dsId;
              if (id) {
                // Store the response object as-is (no fabrication)
                setDataSource(id, ds as any);
              }
            }
          } catch (err) {
            console.error(`Failed to fetch data source ${dsId}:`, err);
          }
        });
        
        await Promise.all(dataSourcePromises);
        
        // Set currentView with id and type
        const viewIdToSet = newView?.id || "";
        setCurrentView(boardId, viewIdToSet, newView?.viewType || view);
      }
      
      toast.success("View Added Succesfully");
      //update the context
      //  updateBoard(boardId, updatedBoard);
    } catch (err) {
      console.error("failed to create view ", err);
      toast.error("Failed to create view !");
      // rollback to previous view
      updateBoard(boardId, board);
      const firstView = board.viewsType?.[0];
      if (firstView) {
        setCurrentView(boardId, firstView.id || "", firstView.viewType);
      }
    }
    setIsDialogOpen(false);
  };

  if (!board) {
    return <div className="p-4 text-muted-foreground">⚠️ Board not found</div>;
  }
 
  return (
    <div className="space-y-4 w-full">
      {/* Toolbar */}
      <BoardToolbar
        currentView={(currentView[boardId]?.id || currentView[boardId]?.type || board?.viewsType?.[0]?.id || board?.viewsType?.[0]?.viewType || "")}
        onChangeView={(viewId) => {
          // IMPORTANT: Always match by view ID first, only use type as fallback
          let view;
          // Try to find by ID first
          view = board.viewsType?.find((v) => v.id === viewId);
          // If not found by ID, try by type (fallback)
          if (!view) {
            view = board.viewsType?.find((v) => v.viewType === viewId);
          }
          if (view) {
            // Always pass the view's ID if it exists, otherwise use viewId parameter
            setCurrentView(boardId, view.id || viewId, view.viewType);
          }
        }}
        onAddView={() => {
          setIsDialogOpen(true);
        }}
        onSettings={() => console.log("Open settings")}
        boardViewsType={board.viewsType}
        board={board}
      >
        {isDialogOpen && (
          <AddViewDialog
            existingViews={board.viewsType}
            onSelect={handleAddView}
            onClose={() => setIsDialogOpen(false)}
          />
        )}
      </BoardToolbar>

      {/* Filters and Sorts Bar */}
      <FiltersAndSortsBar 
        board={board} 
        boardProperties={getCurrentDataSourceProperties(boardId) || board.properties || {}}
      />

      {/* View Renderer */}
      <div className="rounded-lg bg-background p-2 w-full">
        {boardView === "board" && <BoardView board={board} notes={boardNotes} />}
        {boardView === "calendar" && <CalendarView board={board} notes={boardNotes} />}
        {boardView === "timeline" && <TimelineView board={board} notes={boardNotes} />}
        {boardView === "list" && <ListView board={board} notes={boardNotes} />}
        {boardView === "forms" && <FormView board={board} notes={boardNotes} />}
      </div>
    </div>
  );
}
