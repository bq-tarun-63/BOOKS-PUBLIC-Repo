// context/BoardContext.tsx
"use client";

import { postWithAuth, getWithAuth } from "@/lib/api-helpers";
import type { Comment, DatabaseSource, Note, SortItem, ViewCollection } from "@/types/board";
import type { BoardProperties } from "@/types/board";
import { type ReactNode, createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import { useSocketContext } from "@/contexts/socketContext";

interface BoardContextType {
  boards: ViewCollection[];
  notes: Record<string, Note[]>; // key: dataSourceId -> Note[]
  dataSources: Record<string, DatabaseSource>; // key: dataSourceId -> DatabaseSource
  setBoards: (board: ViewCollection[]) => void;
  setNotesState: (dataSourceId: string, notes: Note[]) => void;
  addBoard: (board: ViewCollection) => void;
  updateBoard: (boardId: string, updatedBoard: ViewCollection) => void;
  removeBoard: (boardId: string) => void;
  updateNote: (dataSourceId: string, noteId: string, updatedNote: Note) => void;
  updateAllNotes: (dataSourceId: string, newNotes: Note[]) => void;
  updateNoteComments: (dataSourceId: string, noteId: string, newComment: Comment) => void;
  refreshNotes: (dataSourceId: string) => Promise<void>; // Refresh notes for a dataSourceId from API
  getNotesByBoardId: (boardId: string) => Note[]; // Helper to get all notes for a board (aggregates from all dataSourceIds)
  getNotesByDataSourceId: (dataSourceId: string) => Note[]; // Helper to get notes for a specific dataSourceId
  getNoteById: (noteId: string) => Note | null; // Helper to get a note by ID from any data source
  getRelationNoteTitle: (noteId: string, linkedDatabaseId: string, fallbackTitle?: string) => string; // Get current title of a relation note

  // Data Source management
  setDataSource: (dataSourceId: string, dataSource: DatabaseSource) => void;
  setDataSources: (dataSources: Record<string, DatabaseSource>) => void;
  updateDataSource: (dataSourceId: string, updatedDataSource: Partial<DatabaseSource>) => void;
  getDataSource: (dataSourceId: string) => DatabaseSource | undefined;
  
  // Current state
  currentDataSource: Record<string, string | undefined>; // boardId -> dataSourceId
  getCurrentDataSource: (boardId: string) => DatabaseSource | undefined;
  getCurrentDataSourceProperties: (boardId: string) => BoardProperties;

  groupBy: Record<string, string | undefined>; // key: viewTypeId -> propertyId
  setGroupBy: (viewTypeId: string, propertyId: string | undefined) => void;
  getGroupBy: (boardId: string) => string | undefined; // Helper to get groupBy for current view

  filters: Record<string, Record<string, string[]>>; // key: viewTypeId -> { propertyId: string[] }
  setBoardFilters: (viewTypeId: string, boardFilters: Record<string, string[]>) => void;
  getFilters: (boardId: string) => Record<string, string[]>; // Helper to get filters for current view

  advancedFilters: Record<string, any[]>; // key: viewTypeId -> IAdvancedFilterGroup[]
  setAdvancedFilters: (viewTypeId: string, advancedFilters: any[]) => void;
  getAdvancedFilters: (boardId: string) => any[]; // Helper to get advanced filters for current view

  sortBy: Record<string, SortItem[]>; // key: viewTypeId -> SortItem[]
  setBoardSortBy: (viewTypeId: string, boardSorts: SortItem[]) => void;
  getSortBy: (boardId: string) => SortItem[]; // Helper to get sortBy for current view

  propertyVisibility: Record<string, string[]>; // key: viewTypeId -> propertyId[]
  setPropertyVisibility: (viewTypeId: string, propertyIds: string[]) => void;
  getPropertyVisibility: (boardId: string) => string[]; // Helper to get propertyVisibility for current view

  propertyOrder: Record<string, string[]>; // key: boardId → order of properties
  setPropertyOrder: (boardId: string, order: string[]) => void;

  currentBoardNoteId: string | null;
  setCurrentBoardNoteId: (noteId: string | null) => void;

  currentView: Record<string, { id?: string; type: string }>; // boardId -> { id?, type }
  setCurrentView: (boardId: string, viewId: string, viewType: string) => void;

  searchQuery: Record<string, string>;
  setSearchQuery: (boardId: string, query: string) => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider = ({ children }: { children: ReactNode }) => {
  const { socket } = useSocketContext();
  const [boards, setBoards] = useState<ViewCollection[]>([]);
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  const [dataSources, setDataSourcesState] = useState<Record<string, DatabaseSource>>({});
  const [currentDataSource, setCurrentDataSourceState] = useState<Record<string, string | undefined>>({});
  // Settings stored per viewTypeId (not boardId)
  const [groupBy, setGroupByState] = useState<Record<string, string | undefined>>({}); // key: viewTypeId
  const [filters, setFilters] = useState<Record<string, Record<string, string[]>>>({}); // key: viewTypeId
  const [advancedFilters, setAdvancedFiltersState] = useState<Record<string, any[]>>({}); // key: viewTypeId
  const [propertyOrder, setPropertyOrderState] = useState<Record<string, string[]>>({}); // key: boardId (for backward compatibility)
  const [propertyVisibility, setPropertyVisibilityState] = useState<Record<string, string[]>>({}); // key: viewTypeId
  const [currentBoardNoteId, setCurrentBoardNoteId] = useState<string | null>(null);
  const [currentView, setCurrentViewState] = useState<Record<string, { id?: string; type: string }>>({});
  const [sortBy, setSortBy] = useState<Record<string, SortItem[]>>({}); // key: viewTypeId
  const [searchQuery, setSearchQueryState] = useState<Record<string, string>>({}); // key: boardId (for backward compatibility)

  // Refresh notes for a dataSourceId by fetching from API
  const refreshNotes = async (dataSourceId: string) => {
    const normalizedDataSourceId = typeof dataSourceId === "string" ? dataSourceId : String(dataSourceId);
    try {
      const response = await getWithAuth(`/api/database/getdataSource/${normalizedDataSourceId}`) as {
        success?: boolean;
        collection?: {
          dataSource?: DatabaseSource;
          notes?: Note[];
        };
      };

      if (response?.success && response.collection?.notes) {
        setNotesState(normalizedDataSourceId, response.collection.notes);
        // Also update dataSource if provided
        if (response.collection.dataSource) {
          const ds = response.collection.dataSource;
          const dsId = ds._id 
            ? (typeof ds._id === "string" 
                ? ds._id 
                : (ds._id as { toString: () => string }).toString()) 
            : normalizedDataSourceId;
          setDataSource(dsId, ds);
        }
      }
    } catch (error) {
      console.error(`Failed to refresh notes for dataSourceId ${normalizedDataSourceId}:`, error);
    }
  };

  // Listen for note update events from webhooks
  useEffect(() => {
    if (!socket) return;

    const handleNoteUpdated = (data: { noteId: string; dataSourceId: string }) => {
      console.log("[Board Context] Note updated event received:", data);
      if (data.dataSourceId) {
        // Refresh notes for this dataSourceId
        refreshNotes(data.dataSourceId).catch((err) => {
          console.error("[Board Context] Failed to refresh notes after update:", err);
        });
      }
    };

    socket.on("note-updated", handleNoteUpdated);

    return () => {
      socket.off("note-updated", handleNoteUpdated);
    };
  }, [socket]);

  type ReorderResponse = { 
    success: boolean; 
    dataSource?: DatabaseSource;
    message?: string 
  } | { isError: true; message: string };
  
  const savePropertyOrder = async (boardId: string, order: string[], dataSourceId: string) => {
    // Get current view for audit purposes
    const currentViewData = currentView[boardId];
    const board = boards.find((b) => b._id === boardId);
    let viewId: string | undefined;
    if (board && currentViewData?.id) {
      const view = board.viewsType?.find((v) => v.id === currentViewData.id);
      viewId = view?.id;
    }
    
    const res = await postWithAuth<ReorderResponse>("/api/database/reOrderSchema", { 
      dataSourceId,
      viewId, // Optional for audit
      order 
    });
    if ((res as { isError?: true; message?: string })?.isError) {
      throw new Error(res.message || "Failed to save property order");
    }
    if (!(res as { success?: boolean }).success) {
      throw new Error("Failed to save property order");
    }
    
    // Update context with returned dataSource
    const response = res as { success?: boolean; dataSource?: DatabaseSource };
    if (response.dataSource) {
      const ds = response.dataSource;
      const responseDsId = ds._id 
        ? (typeof ds._id === "string" 
            ? ds._id 
            : (ds._id as { toString: () => string }).toString()) 
        : dataSourceId;
      setDataSource(responseDsId, ds);
    }
  };

  const setPropertyOrder = (boardId: string, order: string[]) => {
    // Get dataSourceId from current view
    const currentViewData = currentView[boardId];
    const board = boards.find((b) => b._id === boardId);
    
    let dataSourceId: string | null = null;
    if (board && currentViewData) {
      let view;
      if (currentViewData.id) {
        view = board.viewsType?.find((v) => v.id === currentViewData.id);
      } else if (currentViewData.type) {
        view = board.viewsType?.find((v) => v.viewType === currentViewData.type);
      }
      const dsId = view?.databaseSourceId;
      dataSourceId = dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
    }
    
    if (!dataSourceId) {
      console.error("No dataSourceId found for current view, cannot save property order");
      // Still update local state for UI responsiveness
      setPropertyOrderState((prev) => ({
        ...prev,
        [boardId]: order,
      }));
      return;
    }
    
    setPropertyOrderState((prev) => ({
      ...prev,
      [boardId]: order,
    }));

    // also persist to API here
    savePropertyOrder(boardId, order, dataSourceId);
  };
  const getCurrentViewTypeId = (boardId: string): string | null => {
    const currentViewData = currentView[boardId];
    const board = boards.find((b) => b._id === boardId);
    if (!board || !currentViewData) return null;
    
    let view;
    if (currentViewData.id) {
      const currentViewId = typeof currentViewData.id === "string" ? currentViewData.id : String(currentViewData.id);
      view = board.viewsType?.find((v) => {
        const viewId = typeof v.id === "string" ? v.id : String(v.id);
        return viewId === currentViewId;
      });
    } else if (currentViewData.type) {
      view = board.viewsType?.find((v) => v.viewType === currentViewData.type);
    }
    
    return view?.id ? (typeof view.id === "string" ? view.id : String(view.id)) : null;
  };

  const setBoardFilters = (viewTypeId: string, boardFilters: Record<string, string[]>) => {
    setFilters((prev) => ({ ...prev, [viewTypeId]: boardFilters }));
  };

  const setAdvancedFilters = (viewTypeId: string, advancedFiltersArray: any[]) => {
    setAdvancedFiltersState((prev) => ({ ...prev, [viewTypeId]: advancedFiltersArray }));
  };

  const setGroupBy = (viewTypeId: string, propertyId: string | undefined) => {
    setGroupByState((prev) => ({
      ...prev,
      [viewTypeId]: propertyId,
    }));
  };

  const setBoardSortBy = (viewTypeId: string, sorts: SortItem[]) => {
    setSortBy((prev) => ({
      ...prev,
      [viewTypeId]: sorts,
    }));
  };

  const setPropertyVisibility = (viewTypeId: string, propertyIds: string[]) => {
    setPropertyVisibilityState((prev) => {
      const updated = {
        ...prev,
        [viewTypeId]: propertyIds,
      };
      return updated;
    });
  };

  const getFilters = (boardId: string): Record<string, string[]> => {
    const viewTypeId = getCurrentViewTypeId(boardId);
    if (!viewTypeId) return {};
    return filters[viewTypeId] || {};
  };

  const getAdvancedFilters = (boardId: string): any[] => {
    const viewTypeId = getCurrentViewTypeId(boardId);
    if (!viewTypeId) return [];
    return advancedFilters[viewTypeId] || [];
  };

  const getGroupBy = (boardId: string): string | undefined => {
    const viewTypeId = getCurrentViewTypeId(boardId);
    if (!viewTypeId) return undefined;
    return groupBy[viewTypeId];
  };

  const getSortBy = (boardId: string): SortItem[] => {
    const viewTypeId = getCurrentViewTypeId(boardId);
    if (!viewTypeId) return [];
    return sortBy[viewTypeId] || [];
  };

  const getPropertyVisibility = (boardId: string): string[] => {
    const viewTypeId = getCurrentViewTypeId(boardId);
    if (!viewTypeId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[boardContext] getPropertyVisibility: No viewTypeId for boardId', boardId);
      }
      return [];
    }
    const result = propertyVisibility[viewTypeId] || [];
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[boardContext] getPropertyVisibility:', {
        boardId,
        viewTypeId,
        result,
        allPropertyVisibilityKeys: Object.keys(propertyVisibility),
        propertyVisibilityState: propertyVisibility
      });
    }
    return result;
  };

  const setSearchQuery = (boardId: string, query: string) => {
    setSearchQueryState((prev) => ({
      ...prev,
      [boardId]: query,
    }));
  };

  const setCurrentView = (boardId: string, viewId: string, viewType: string) => {
    setCurrentViewState((prev) => ({
      ...prev,
      [boardId]: { id: viewId || undefined, type: viewType },
    }));
    
    // Automatically sync currentDataSource when view changes
    // IMPORTANT: Always match by view ID first, only use type as fallback
    const board = boards.find((b) => b._id === boardId);
    if (board) {
      let view;
      if (viewId) {
        // Prioritize ID match - if viewId exists, ONLY match by ID
        view = board.viewsType?.find((v) => v.id === viewId);
      } else {
        // Only fallback to type if no ID is available
        view = board.viewsType?.find((v) => v.viewType === viewType);
      }
      if (view?.databaseSourceId) {
        setCurrentDataSourceState((prev) => ({
          ...prev,
          [boardId]: view.databaseSourceId || undefined,
        }));
      }

      // Load settings from viewType when view changes
      if (view?.id && view.settings) {
        const viewTypeId = typeof view.id === "string" ? view.id : String(view.id);
        
        // Load filters - only load regular filters (not advanced)
        // Advanced filters are stored in settings but not in context filters
        if (view.settings.filters) {
          const filtersMap: Record<string, string[]> = {};
          view.settings.filters.forEach((filter) => {
            // Skip advanced filters - they're handled separately
            if (filter.isAdvanced) {
              return;
            }
            if (!filtersMap[filter.propertyId]) {
              filtersMap[filter.propertyId] = [];
            }
            // Convert filter.value to array if needed
            if (Array.isArray(filter.value)) {
              filtersMap[filter.propertyId] = filter.value;
            } else if (filter.value !== undefined && filter.value !== null) {
              filtersMap[filter.propertyId] = [filter.value];
            }
          });
          setBoardFilters(viewTypeId, filtersMap);
        }

        // Load advanced filters
        if (view.settings.advancedFilters && Array.isArray(view.settings.advancedFilters)) {
          setAdvancedFilters(viewTypeId, view.settings.advancedFilters);
        } else {
          setAdvancedFilters(viewTypeId, []);
        }

        // Load sorts
        if (view.settings.sorts) {
          setBoardSortBy(viewTypeId, view.settings.sorts.map(s => ({
            propertyId: s.propertyId,
            direction: s.direction,
          })));
        }

        // Load groupBy
        if (view.settings.group) {
          setGroupBy(viewTypeId, view.settings.group.propertyId);
        }

        // Load property visibility - always set, even if empty array
        if (view.settings.propertyVisibility && Array.isArray(view.settings.propertyVisibility)) {
          const visibilityIds = view.settings.propertyVisibility.map((pv: any) => 
            typeof pv === 'string' ? pv : pv.propertyId
          );
          setPropertyVisibility(viewTypeId, visibilityIds);
        }
      }
    }
  };

  // Data Source management functions
  const setDataSource = (dataSourceId: string, dataSource: DatabaseSource) => {
    setDataSourcesState((prev) => ({
      ...prev,
      [dataSourceId]: dataSource,
    }));
  };

  const setDataSources = (newDataSources: Record<string, DatabaseSource>) => {
    setDataSourcesState(newDataSources);
  };

  const updateDataSource = (dataSourceId: string, updatedDataSource: Partial<DatabaseSource>) => {
    setDataSourcesState((prev) => {
      const existing = prev[dataSourceId];
      if (!existing) return prev;
      return {
        ...prev,
        [dataSourceId]: { ...existing, ...updatedDataSource },
      };
    });
  };

  const getDataSource = (dataSourceId: string): DatabaseSource | undefined => {
    return dataSources[dataSourceId];
  };

  const getCurrentDataSource = (boardId: string): DatabaseSource | undefined => {
    const dataSourceId = currentDataSource[boardId];
    if (!dataSourceId) return undefined;
    return dataSources[dataSourceId];
  };

  const getCurrentDataSourceProperties = (boardId: string): BoardProperties => {
    const dataSource = getCurrentDataSource(boardId);
    return dataSource?.properties || {};
  };

  // Sync currentDataSource when boards or views change
  // IMPORTANT: Always match by view ID first, only use type as fallback
  useEffect(() => {
    boards.forEach((board) => {
      const currentViewData = currentView[board._id];
      if (currentViewData) {
        // Prioritize ID match - if currentViewData.id exists, ONLY match by ID
        let view;
        if (currentViewData.id) {
          view = board.viewsType?.find((v) => v.id === currentViewData.id);
        } else {
          // Only fallback to type if no ID is available
          view = board.viewsType?.find((v) => v.viewType === currentViewData.type);
        }
        if (view?.databaseSourceId) {
          setCurrentDataSourceState((prev) => {
            if (prev[board._id] !== view.databaseSourceId) {
              return { ...prev, [board._id]: view.databaseSourceId || undefined };
            }
            return prev;
          });
        }
      }
    });
  }, [boards, currentView]);

  // Track which data sources are being fetched to prevent duplicate calls
  const fetchingDataSourcesRef = useRef<Set<string>>(new Set());
  
  // Load all data sources for loaded boards' views on mount/updates (unique only)
  useEffect(() => {
    const fetchMissingDataSources = async () => {
      const missingIds = new Set<string>();
      boards.forEach((board) => {
        (board.viewsType || []).forEach((vt) => {
          const dsId = vt.databaseSourceId;
          if (dsId) {
            const normalizedId = typeof dsId === "string" ? dsId : String(dsId);
            // Only fetch if not already in state and not currently being fetched
            if (!dataSources[normalizedId] && !fetchingDataSourcesRef.current.has(normalizedId)) {
              missingIds.add(normalizedId);
            }
          }
        });
      });

      if (missingIds.size === 0) return;

      // Mark as being fetched
      missingIds.forEach((id) => fetchingDataSourcesRef.current.add(id));

      await Promise.all(
        Array.from(missingIds).map(async (id) => {
          try {
            const res = (await getWithAuth(`/api/database/getdataSource/${id}`)) as { success?: boolean; collection?: { dataSource?: any } };
            if (res?.success && res.collection?.dataSource) {
              const ds = res.collection.dataSource;
              const normalizedId = typeof ds._id === "string" ? ds._id : ds._id?.toString?.() || id;
              // Store the response object as-is (no fabrication), keyed by normalized id
              setDataSource(normalizedId, ds as any);
            }
          } catch (e) {
            // ignore individual failures, continue others
          } finally {
            // Remove from fetching set when done
            fetchingDataSourcesRef.current.delete(id);
          }
        }),
      );
    };

    fetchMissingDataSources();
  }, [boards, dataSources]);

  const addBoard = (board: ViewCollection) => {
    setBoards((prev) => [...prev, board]);
  };

  const updateBoard = (boardId: string, updatedBoard: ViewCollection) => {
    console.log("Updating board:...............", boardId, updatedBoard);

    setBoards((prev) => {
      console.log("Previous Boards:............", prev);
      return prev.map((b) => (b._id === boardId ? { ...b, ...updatedBoard } : b));
    });
  };

  const setNotesState = (dataSourceId: string, boardNotes: Note[]) => {
    const normalizedDataSourceId = typeof dataSourceId === "string" ? dataSourceId : String(dataSourceId);
    setNotes((prev) => ({
      ...prev,
      [normalizedDataSourceId]: boardNotes,
    }));
  };

  const removeBoard = (boardId: string) => {
    setBoards((prev) => prev.filter((b) => b._id !== boardId));
    // Remove notes for all dataSourceIds in this board's views
    const board = boards.find((b) => b._id === boardId);
    if (board) {
    setNotes((prev) => {
        const updated = { ...prev };
        (board.viewsType || []).forEach((vt) => {
          if (vt.databaseSourceId) {
            const dsId = typeof vt.databaseSourceId === "string" ? vt.databaseSourceId : String(vt.databaseSourceId);
            delete updated[dsId];
          }
        });
        return updated;
      });
    }
  };

  const updateNote = (dataSourceId: string, noteId: string, updatedNote: Note) => {
    const normalizedDataSourceId = typeof dataSourceId === "string" ? dataSourceId : String(dataSourceId);
    const normalizedNoteId = typeof noteId === "string" ? noteId : String(noteId);
    
    setNotes((prev) => {
      // Update in the specified data source
      const dataSourceNotes = prev[normalizedDataSourceId] || [];
      const noteExists = dataSourceNotes.some((note: Note) => String(note._id) === normalizedNoteId);

      let updatedNotes: Note[];
      if (noteExists) {
        updatedNotes = dataSourceNotes.map((note: Note) => (String(note._id) === normalizedNoteId ? updatedNote : note));
      } else {
        updatedNotes = [...dataSourceNotes, updatedNote];
      }
      
      const newNotes = {
        ...prev,
        [normalizedDataSourceId]: updatedNotes,
      };
      
      // Also update the note in all other data sources where it might exist
      // This ensures relation displays stay in sync when a note's title changes
      for (const dsId in newNotes) {
        if (dsId !== normalizedDataSourceId) {
          const otherNotes = newNotes[dsId];
          if (otherNotes && Array.isArray(otherNotes)) {
            const noteIndex = otherNotes.findIndex((note: Note) => String(note._id) === normalizedNoteId);
            if (noteIndex !== -1) {
              // Update the note in this data source too (especially for relation notes)
              newNotes[dsId] = otherNotes.map((note: Note, idx: number) => 
                idx === noteIndex ? { ...note, title: updatedNote.title } : note
              );
            }
          }
        }
      }
      
      return newNotes;
    });
  };

  const updateAllNotes = (dataSourceId: string, newNotes: Note[]) => {
    const normalizedDataSourceId = typeof dataSourceId === "string" ? dataSourceId : String(dataSourceId);
    setNotes((prev) => ({
      ...prev,
      [normalizedDataSourceId]: newNotes,
    }));
  };

  // 🆕 Add new comment to a note in the correct data source
  const updateNoteComments = (dataSourceId: string, noteId: string, newComment: Comment) => {
    const normalizedDataSourceId = typeof dataSourceId === "string" ? dataSourceId : String(dataSourceId);
    setNotes((prev) => {
      const dataSourceNotes = prev[normalizedDataSourceId] || [];
      const updatedNotes = dataSourceNotes.map((note) =>
        note._id === noteId ? { ...note, comments: [...(note.comments || []), newComment] } : note,
      );

      return { ...prev, [normalizedDataSourceId]: updatedNotes };
    });
  };

  // Helper to get all notes for a board (aggregates from all dataSourceIds in that board's views)
  const getNotesByBoardId = (boardId: string): Note[] => {
    const board = boards.find((b) => b._id === boardId);
    if (!board) return [];
    
    const allNotes: Note[] = [];
    const noteIds = new Set<string>(); // To avoid duplicates
    
    (board.viewsType || []).forEach((vt) => {
      if (vt.databaseSourceId) {
        const dsId = typeof vt.databaseSourceId === "string" ? vt.databaseSourceId : String(vt.databaseSourceId);
        const dsNotes = notes[dsId] || [];
        dsNotes.forEach((note) => {
          if (!noteIds.has(note._id)) {
            noteIds.add(note._id);
            allNotes.push(note);
          }
        });
      }
    });
    
    return allNotes;
  };

  // Helper to get notes for a specific dataSourceId
  const getNotesByDataSourceId = (dataSourceId: string): Note[] => {
    const normalizedDataSourceId = typeof dataSourceId === "string" ? dataSourceId : String(dataSourceId);
    return notes[normalizedDataSourceId] || [];
  };

  // Helper to get a note by ID from any data source (searches all data sources)
  // This is useful for relation properties where we need to find the current title
  const getNoteById = (noteId: string): Note | null => {
    if (!noteId) return null;
    const normalizedNoteId = typeof noteId === "string" ? noteId : String(noteId);
    
    // Search through all data sources
    for (const dataSourceId in notes) {
      const dataSourceNotes = notes[dataSourceId];
      if (dataSourceNotes && Array.isArray(dataSourceNotes)) {
        const foundNote = dataSourceNotes.find((note: Note) => 
          String(note._id) === normalizedNoteId
        );
        if (foundNote) {
          return foundNote;
        }
      }
    }
    
    return null;
  };

  // Helper to get relation note title from context (with fallback to stored value)
  const getRelationNoteTitle = (noteId: string, linkedDatabaseId: string, fallbackTitle?: string): string => {
    if (!noteId) return fallbackTitle || "Untitled";
    
    // First, try to get from the linked database source
    if (linkedDatabaseId) {
      const normalizedDataSourceId = typeof linkedDatabaseId === "string" ? linkedDatabaseId : String(linkedDatabaseId);
      const linkedNotes = notes[normalizedDataSourceId];
      if (linkedNotes && Array.isArray(linkedNotes)) {
        const foundNote = linkedNotes.find((note: Note) => String(note._id) === noteId);
        if (foundNote?.title) {
          return foundNote.title;
        }
      }
    }
    
    // If not found in linked source, search all data sources
    const foundNote = getNoteById(noteId);
    if (foundNote?.title) {
      return foundNote.title;
    }
    
    // Fallback to stored title or default
    return fallbackTitle || "Untitled";
  };


  const contextValue = useMemo(
    () => ({
      boards,
      notes,
      dataSources,
      setBoards,
      setNotesState,
      updateBoard,
      addBoard,
      removeBoard,
      updateNote,
      updateAllNotes,
      setDataSource,
      setDataSources,
      updateDataSource,
      getDataSource,
      currentDataSource,
      getCurrentDataSource,
      getCurrentDataSourceProperties,
      groupBy,
      setGroupBy,
      getGroupBy,
      filters,
      setBoardFilters,
      getFilters,
      advancedFilters,
      setAdvancedFilters,
      getAdvancedFilters,
      propertyOrder,
      setPropertyOrder,
      propertyVisibility,
      setPropertyVisibility,
      getPropertyVisibility,
      currentBoardNoteId,
      setCurrentBoardNoteId,
      updateNoteComments,
      refreshNotes,
      getNotesByBoardId,
      getNotesByDataSourceId,
      getNoteById,
      getRelationNoteTitle,
      currentView,
      setCurrentView,
      sortBy,
      setBoardSortBy,
      getSortBy,
      searchQuery,
      setSearchQuery,
    }),
    [boards, notes, dataSources, currentDataSource, groupBy, filters, advancedFilters, propertyOrder, propertyVisibility, currentBoardNoteId, currentView, sortBy, searchQuery],
  );

  return <BoardContext.Provider value={contextValue}>{children}</BoardContext.Provider>;
};

export const useBoard = (): BoardContextType => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error("useBoard must be used inside a BoardProvider");
  }
  return context;
};
