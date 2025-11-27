"use client";

import EllipsisIcon from "@/components/tailwind/ui/icons/ellipsisIcon";
import PlusIcon from "@/components/tailwind/ui/icons/plusIcon";
import { useNoteDragAndDrop } from "@/hooks/use-NoteDragAndDrop";
import useAddRootPage from "@/hooks/use-addRootPage";
import { useDragAndDrop } from "@/hooks/use-dragAndDrop";
import useNoteActions from "@/hooks/use-updateNode";
import { addCard, deleteCard, editCard } from "@/services-frontend/boardServices/boardServices";
import type { BoardPropertyOption, Note, ViewCollection } from "@/types/board";
import type { JSONContent } from "novel";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Draggable } from "../draggable";
import { NoteDraggable } from "../noteDraggable";
import { useBoard } from "@/contexts/boardContext";
import { handleReorderPropertyOptions } from "@/services-frontend/boardServices/dragAndDropServices";
import useBoardFunctions from "@/hooks/use-board";
import { useNoteContext } from "@/contexts/NoteContext";
import { applySorting } from "@/utils/sortingCard";
import { getRelationIdsFromValue } from "@/utils/relationUtils";
import { computeRollupData, getRollupComparableValue } from "@/utils/rollupUtils";
import { applyAdvancedFilters } from "@/utils/advancedFilterUtils";

import RightSidebar from "../rightSidebar";
import BoardCard from "./boardViewCard";
import { getColorStylesWithBadge } from "@/utils/colorStyles";

// ---------------- Types ----------------

export type Column = {
  id: string;
  title: string;
  propId: string;
  optionId: string;
  optionName: string;
  bgColor: string;
  textColor: string;
  badgeColor: string;
  dotColor: string;
  cards: Note[];
  count: number;
};

interface BoardViewProps {
  board: ViewCollection;
  notes: Note[];
}

// ---------------- BoardView ----------------
export default function BoardView({ board, notes }: BoardViewProps) {
  const [selectedTask, setSelectedTask] = useState<Note | null>(null);
  const [showAddInput, setShowAddInput] = useState<string | null>(null);
  const [rightSidebarContent, setRightSidebarContent] = useState<JSONContent | null>(null);
  const { addRootPage } = useAddRootPage();
  const { UpdateNote, DeleteNote } = useNoteActions();
  const [isClosing, setIsClosing] = useState(false);
  const previousCardIdRef = useRef<string | null>(null);
  const colorAssignments = useRef<Record<string, any>>({});
  const { updateNote, updateAllNotes, setCurrentBoardNoteId, getCurrentDataSource, currentDataSource, dataSources, updateDataSource, setDataSource, currentView, boards: contextBoards } = useBoard();
  const { selectedNoteId } = useNoteContext();
  const { getGroupBy, getFilters, getAdvancedFilters, getSortBy, searchQuery, getRelationNoteTitle, getNotesByDataSourceId, getDataSource } = useBoard();
  const groupByPropertyId = getGroupBy(board._id);
  
  // Get current dataSourceId from current view ID (not type)
  // IMPORTANT: Always match by view ID first, only use type as fallback
  const getCurrentDataSourceId = (): string | null => {
    const currentViewData = currentView[board._id];
    const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
    
    let view;
    if (currentViewData?.id) {
      // Prioritize ID match - if currentViewData.id exists, ONLY match by ID
      view = latestBoard.viewsType?.find((vt) => vt.id === currentViewData.id);
    } else if (currentViewData?.type) {
      // Only fallback to type if no ID is available
      view = latestBoard.viewsType?.find((vt) => vt.viewType === currentViewData.type);
    }
    
    const dsId = view?.databaseSourceId;
    return dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
  };
  
  // Get properties from current data source - memoize to avoid recreating on every render
  // Depend on actual values instead of functions to prevent infinite loops
  const boardProperties = useMemo(() => {
    const dataSourceId = currentDataSource[board._id];
    if (dataSourceId && dataSources[dataSourceId]) {
      return dataSources[dataSourceId].properties || {};
    }
    return board.properties || {};
  }, [currentDataSource, dataSources, board._id, board.properties]);

  const { handleCardClick, handleCloseSidebar } = useBoardFunctions({
    board,
    setSelectedTask,
    setRightSidebarContent,
    setIsClosing,
    previousCardIdRef,
  });

  // Find the status property (the one with default: true)
  const statusPropEntry = Object.entries(boardProperties).find(([_, prop]) => prop.type === "status" && prop.default);

  const statusOptions: { id: string; name: string }[] =
    statusPropEntry && Array.isArray(statusPropEntry[1].options) ? statusPropEntry[1].options : [];

  // Build a map for quick lookups
  const statusOrderMap = new Map(statusOptions.map((opt, index) => [opt.name, index]));

  // Helper function to convert option color to CSS colors
  const getColorFromOption = (colorName = "default") => {
    return getColorStylesWithBadge(colorName);
  };

  const getStatusColor = (option: { name: string; color?: string }) => {
    return getColorFromOption(option.color || "default");
  };

  const getGroupByProps = () => {
    if (!boardProperties || Object.keys(boardProperties).length === 0) return [];

    //if user has choosen property for grouping
    if (groupByPropertyId && boardProperties[groupByPropertyId]) {
      return [[groupByPropertyId, boardProperties[groupByPropertyId]]];
    }

    //else fallback to default property with default = true
    return Object.entries(boardProperties).filter(([_, prop]: any) => prop.type === "status" && prop.default);
  };

  // Build columns dynamically - memoize to avoid recreating on every render
  const buildColumns = useCallback((board: ViewCollection, notes: Note[]): Column[] => {
    // Use boardProperties from current data source
    const props = boardProperties || {};
    if (!props || Object.keys(props).length === 0) return [];

    // Get props to group by using the determined props
    const propsToGroupBy = (() => {
      if (!props || Object.keys(props).length === 0) return [];
      if (groupByPropertyId && props[groupByPropertyId]) {
        return [[groupByPropertyId, props[groupByPropertyId]]];
      }
      return Object.entries(props).filter(([_, prop]: any) => prop.type === "status" && prop.default);
    })();
    
    if (propsToGroupBy.length === 0) return [];

    const cols: Column[] = [];

    propsToGroupBy.forEach(([propId, prop]: any) => {
      if (Array.isArray(prop.options)) {
        // ✅ Status / Select property
        prop.options.forEach((opt: any) => {
          const colors = getStatusColor(opt);
          let cards: Note[] = notes
            .filter((n) => n.noteType === "Viewdatabase_Note")
            .filter((n) => n.databaseProperties?.[propId] === opt.name);

          // Apply sorting filter on cards
            const boardSorts = getSortBy(board._id) || [];
          if (boardSorts.length > 0) {
            cards = applySorting(cards, boardSorts, props, {
              getNotesByDataSourceId,
              getDataSource,
            });
          }
          if(colors)
          cols.push({
            id: opt.id,
            title: opt.name,
            bgColor: colors.bg,
            textColor: colors.text,
            badgeColor: colors.badge,
            dotColor: colors.dot,
            cards,
            count: cards.length,
            propId,
            optionId: opt.id,
            optionName: opt.name,
          });
        });
      } else if (prop.type === "person") {
        // ✅ Group by assigned members
        console.log("IN the person Category =====+>");
        const allMembers: Map<string, any> = new Map();

        notes.forEach((n) => {
          const assigned = n.databaseProperties?.[propId];
          if (Array.isArray(assigned)) {
            assigned.forEach((m: any) => {
              if (m?.userId) {
                allMembers.set(m.userId, m); // store by userId
              }
            });
          }
        });

        console.log("All Members --------------->", allMembers);
        // Build one column per member
        allMembers.forEach((memberObj, memberId) => {
          let cards = notes.filter(
            (n) =>
              Array.isArray(n.databaseProperties?.[propId]) &&
              n.databaseProperties[propId].some((m: any) => m.userId === memberId),
          );
          // Apply sorting filter
            const boardSorts = getSortBy(board._id) || [];
          if (boardSorts.length > 0) {
            cards = applySorting(cards, boardSorts, props, {
              getNotesByDataSourceId,
              getDataSource,
            });
          }
          cols.push({
            id: memberId,
            title: memberObj.userName || memberObj.userEmail || "Unnamed User", // ✅ string only
            bgColor: "#f9fafb",
            textColor: "#111827",
            badgeColor: "#e5e7eb",
            dotColor: "#6b7280",
            cards,
            count: cards.length,
            propId,
            optionId: memberId,
            optionName: memberObj.userName || "Unnamed User", // ✅ safe fallback
          });
        });
      } else if (prop.type === "relation") {
        // ✅ Group by related notes (value is now only noteId: string or string[])
        const relationLimit = prop.relationLimit || "multiple";
        const linkedDatabaseId = prop.linkedDatabaseId;
        const allRelatedNoteIds: Set<string> = new Set();

        notes.forEach((n) => {
          const relations = n.databaseProperties?.[propId];
          const ids = getRelationIdsFromValue(relations, relationLimit);
          ids.forEach((id) => {
            if (id) {
              allRelatedNoteIds.add(id);
            }
          });
        });

        // Build one column per related note
        allRelatedNoteIds.forEach((noteId) => {
          // Get current title from context (fetches live data)
          const currentTitle = getRelationNoteTitle(noteId, linkedDatabaseId || "", "Untitled");
          
          let cards = notes.filter((n) => {
            const relations = n.databaseProperties?.[propId];
            const ids = getRelationIdsFromValue(relations, relationLimit);
            return ids.includes(noteId);
          });
          // Apply sorting
          const boardSorts = getSortBy(board._id) || [];
          if (boardSorts.length > 0) {
            cards = applySorting(cards, boardSorts, props, {
              getNotesByDataSourceId,
              getDataSource,
            });
          }
          cols.push({
            id: noteId,
            title: currentTitle,
            bgColor: "#f0f9ff",
            textColor: "#0c4a6e",
            badgeColor: "#bae6fd",
            dotColor: "#0284c7",
            cards,
            count: cards.length,
            propId,
            optionId: noteId,
            optionName: currentTitle,
          });
        });
      }
      // Optional "Unassigned" column
      const unassigned = notes.filter((n) => {
        const val = n.databaseProperties?.[propId];
        if (prop.type === "person") {
          return !Array.isArray(val) || val.length === 0;
        }
        if (prop.type === "relation") {
          const relationLimit = prop.relationLimit || "multiple";
          const ids = getRelationIdsFromValue(val, relationLimit);
          return ids.length === 0;
        }
        if (Array.isArray(val)) {
          return val.length === 0;
        }
        return !val;
      });
      // Apply sorting to unassigned cards too
      let sortedUnassigned = unassigned;
            const boardSorts = getSortBy(board._id) || [];
      if (boardSorts.length > 0) {
        sortedUnassigned = applySorting(unassigned, boardSorts, props, {
          getNotesByDataSourceId,
          getDataSource,
        });
      }
      if (sortedUnassigned.length > 0) {
        cols.push({
          id: "unassigned",
          title: prop.type === "person" ? "Unassigned" : prop.type === "relation" ? "No relations" : "Unassigned",
          bgColor: prop.type === "person" ? "#f3f4f6" : prop.type === "relation" ? "#f0f9ff" : "#fff7ed",
          textColor: prop.type === "person" ? "#111827" : prop.type === "relation" ? "#0c4a6e" : "#7c2d12",
          badgeColor: prop.type === "person" ? "#e5e7eb" : prop.type === "relation" ? "#bae6fd" : "#fed7aa",
          dotColor: prop.type === "person" ? "#6b7280" : prop.type === "relation" ? "#0284c7" : "#fb923c",
          cards: sortedUnassigned,
          count: sortedUnassigned.length,
          propId,
          optionId: "unassigned",
          optionName: prop.type === "person" ? "Unassigned Task" : prop.type === "relation" ? "No relations" : "Unassigned",
        });
      }
    });

    return cols.sort((a, b) => (statusOrderMap.get(a.title) ?? 999) - (statusOrderMap.get(b.title) ?? 999));
  }, [boardProperties, groupByPropertyId, getSortBy, board._id]);

  const filteredNotes = useMemo(() => {
    let result = notes;

    // Apply search query first
      const query = searchQuery[board._id] || "";
      if (query.trim()) {
        const searchLower = query.toLowerCase();
        result = result.filter((note) => {
          const titleMatch = note.title.toLowerCase().includes(searchLower);
          
          return titleMatch;
        });
      }

    // Get current view to access settings
    const currentViewData = currentView[board._id];
    const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
    let view;
    if (currentViewData?.id) {
      const currentViewId = typeof currentViewData.id === "string" ? currentViewData.id : String(currentViewData.id);
      view = latestBoard.viewsType?.find((v) => {
        const viewId = typeof v.id === "string" ? v.id : String(v.id);
        return viewId === currentViewId;
      });
    } else if (currentViewData?.type) {
      view = latestBoard.viewsType?.find((v) => v.viewType === currentViewData.type);
    }

    // Check for advanced filters - apply them first if they exist (separate from regular filters)
    const advancedFilters = getAdvancedFilters(board._id);
    if (advancedFilters.length > 0) {
      // Apply advanced filters using the utility function, then continue with regular filters
      result = applyAdvancedFilters(
        result,
        advancedFilters,
        boardProperties,
        getNotesByDataSourceId,
        getDataSource
      );
    }

    // Apply property filters for this specific board (using viewTypeId)
    const boardFilters = getFilters(board._id);
    if (!boardFilters || Object.keys(boardFilters).length === 0) return result;
    
    return result.filter((note) => {
      const noteProps = note.databaseProperties || {};
      
      // Loop over each property filter for this board
      return Object.entries(boardFilters).every(([propId, filterValues]) => {
        const propSchema = boardProperties[propId];
        
        // Handle rollup properties
        if (propSchema?.type === "rollup") {
          const rollupResult = computeRollupData(
            note,
            propSchema,
            boardProperties,
            getNotesByDataSourceId,
            getDataSource,
          );
          
          const rollupValue = getRollupComparableValue(rollupResult);
          
          if (rollupValue === null) {
            return false; // Exclude notes with invalid rollup
          }
          
          const filterArray = Array.isArray(filterValues)
            ? filterValues
            : [filterValues];
          
          // Convert rollup value to string for comparison
          const rollupValueStr = String(rollupValue);
          return filterArray.some(filterVal => {
            const filterStr = String(filterVal);
            // For count/percent, allow numeric comparison
            if (typeof rollupValue === "number" && !isNaN(Number(filterStr))) {
              return rollupValue === Number(filterStr);
            }
            // For text values, check if filter matches
            return rollupValueStr.toLowerCase().includes(filterStr.toLowerCase()) ||
                   filterStr.toLowerCase().includes(rollupValueStr.toLowerCase());
          });
        }
        
        const noteValue = noteProps[propId];

        if (!noteValue) return false; // if note doesn't have this property, exclude

        // Normalize filterValues as array
        const filterArray = Array.isArray(filterValues) ? filterValues : [filterValues];

        // Case 1: multi-select or person properties (noteValue is array)
        if (Array.isArray(noteValue)) {
          return noteValue.some((val) => {
            if (typeof val === "object" && val.userId) {
              return filterArray.includes(val.userName); // person filter
            }
            return filterArray.includes(val); // multi-select filter
          });
        }

        // Case 2: single value properties (string, number, status, etc.)
        return filterArray.includes(noteValue);
      });
    });
  }, [notes, getFilters, board._id, searchQuery[board._id], boardProperties, getNotesByDataSourceId, getDataSource]);

  // Memoize computed columns - depend on actual values, not the function
  const computedColumns = useMemo(() => {
    return buildColumns(board, filteredNotes);
  }, [boardProperties, filteredNotes, groupByPropertyId, getSortBy, board._id]);

  const [columns, setColumns] = useState<Column[]>(computedColumns);
  const boardSorts = getSortBy(board._id);
  const prevDepsRef = useRef({ boardProperties, filteredNotes, groupByPropertyId, boardSorts, boardId: board._id });

  // Sync state with computed columns when dependencies actually change
  useEffect(() => {
    const currentDeps = { boardProperties, filteredNotes, groupByPropertyId, boardSorts, boardId: board._id };
    const prevDeps = prevDepsRef.current;
    
    // Check if any dependency actually changed
    const hasChanged = 
      prevDeps.boardProperties !== currentDeps.boardProperties ||
      prevDeps.filteredNotes !== currentDeps.filteredNotes ||
      prevDeps.groupByPropertyId !== currentDeps.groupByPropertyId ||
      prevDeps.boardSorts !== currentDeps.boardSorts ||
      prevDeps.boardId !== currentDeps.boardId;
    
    if (hasChanged) {
      prevDepsRef.current = currentDeps;
      setColumns(computedColumns);
    }
  }, [computedColumns, boardProperties, filteredNotes, groupByPropertyId, boardSorts, board._id]);

  const currentSelectedTask = useMemo(() => {
    if (!selectedTask) return null;

    // Find the current note data from columns
    for (const column of columns) {
      const foundNote = column.cards.find((card) => card._id === selectedTask._id);
      if (foundNote) {
        return foundNote;
      }
    }

    return selectedTask;
  }, [selectedTask, columns]);

  const { handleDragStart, handleDragOver, handleDragEnd } = useDragAndDrop(columns, setColumns);

  const { handleNoteDragOver, handleNoteDragStart, handleNoteDrop, handleColumnDragOver, activeNote } =
    useNoteDragAndDrop(columns, setColumns, board);

  const handleAddPageClick = async (colId: string, title = "New Task") => {
    // Step 1: Optimistic local update
    const tempColumns = addCard(columns, colId, title);
    setColumns(tempColumns);

    const col = tempColumns.find((c) => c.id === colId);
    if (!col) {
      console.error("Column not found for id", colId);
      return;
    }
    const lastCard = col?.cards.at(-1); // cleaner than slice(-1)[0]
    if (!lastCard) {
      console.error("No temp card created for column:", colId);
      return;
    }

    const tempId = lastCard._id;
    console.log("Printing the propId and optionId -->", col?.propId, col?.optionId);

    try {
      // Get dataSourceId from context (already tracked and synced)
      const dsId = currentDataSource[board._id];
      const dataSourceId: string | undefined = (dsId ? String(dsId) : board._id) as string | undefined;
      // Build databaseProperties object (only if both propId and optionName exist, matching old behavior)
      const databaseProperties = col?.propId && col?.optionName ? { [col.propId]: col.optionName } : {};
      
      const { page: newPage, newPageID } = await addRootPage(
        title,
        null,
        false,
        null,
        false,
        dataSourceId,
        databaseProperties,
        selectedNoteId ? selectedNoteId : "",
      );
      console.log("NewPageId ======", newPageID, tempId);
      // Step 3: Replace temp card ID with real one
      // Step 2: replace temp ID
      // setColumns((prev) => replaceTempCardId(prev, colId, tempId!, newPageID));
      setColumns((prev) =>
        prev.map((c) =>
          c.id === col.id
            ? {
                ...c,
                cards: c.cards.map((card) =>
                  card._id === tempId
                    ? {
                        _id: newPage.id,
                        title: newPage.title,
                        description: newPage.description || "",
                        assign: newPage.assign || [],
                        noteType: newPage.noteType || "Viewdatabase_Note",
                        databaseProperties: newPage.databaseProperties || {},
                        content: newPage.content || "",
                        commitSha: newPage.commitSha,
                        contentPath: newPage.contentPath || "",
                        comments: newPage.comments || [],
                      }
                    : card,
                ),
              }
            : c,
        ),
      );

      const currentDsId = getCurrentDataSourceId();
      if (!currentDsId) {
        console.error("No dataSourceId found for current view");
        return;
      }
      updateNote(currentDsId, tempId, {
        _id: newPage.id,
        title: newPage.title,
        description: newPage.description || "",
        noteType: newPage.noteType || "Viewdatabase_Note",
        databaseProperties: newPage.databaseProperties || {},
        content: newPage.content || "",
        commitSha: newPage.commitSha,
        contentPath: newPage.contentPath || "",
        comments: newPage.comments || [],
      });
    } catch (err) {
      console.error("Failed to create task:", err);
      // Rollback local optimistic card if needed
      setColumns((prev) =>
        prev.map((col) =>
          col.id === colId ? { ...col, cards: col.cards.filter((c) => !c._id.startsWith("temp_")) } : col,
        ),
      );
    }
    setShowAddInput(null);
  };

  const handleEditCard = async (columnId: string, cardId: string, newTitle: string) => {
    setColumns(editCard(columns, columnId, cardId, newTitle));

    // Update RightSidebar title if this card is selected
    if (selectedTask?._id === cardId) {
      setRightSidebarContent((prev) => prev); // optional, just to trigger re-render
      setSelectedTask((prev) => (prev ? { ...prev, title: newTitle } : prev));
    }

    try {
      const updatedNotes = await UpdateNote(cardId, newTitle, null, "");
      if (updatedNotes) {
        const noteToUpdate = notes.find((note) => note._id === cardId);
        if (noteToUpdate) {
          const updatedNote = { ...noteToUpdate, title: newTitle };
          const currentDsId = getCurrentDataSourceId();
          if (currentDsId) {
            updateNote(currentDsId, cardId, updatedNote);
          }

          // Ensure RightSidebar sees the updated title
          if (selectedTask?._id === cardId) {
            setSelectedTask(updatedNote);
          }
        }
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleDeleteCard = async (columnId: string, cardId: string) => {
    setColumns(deleteCard(columns, columnId, cardId));
    try {
      const deleteNote = await DeleteNote(cardId);
      if (deleteNote) {
        const newNotes = notes.filter((note) => note._id !== cardId);
        const currentDsId = getCurrentDataSourceId();
        if (currentDsId) {
          updateAllNotes(currentDsId, newNotes);
        }
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleUpdate = async (updatedNote: Note) => {
    // If title changed → call handleEditCard
    if (updatedNote.title !== selectedTask?.title) {
      handleEditCard(
        // Find the column this card belongs to
        columns.find((col) => col.cards.some((card) => card._id === updatedNote._id))?.id || "",
        updatedNote._id,
        updatedNote.title,
      );
    }
    // Update the card in columns
    setColumns((prevCols) => {
      // Make newCols explicitly Column[]
      const newCols: Column[] = prevCols.map((col) => ({
        ...col,
        cards: col.cards.filter((card) => card._id !== updatedNote._id),
      }));
      console.log("UpdatedNote properties:", updatedNote);

      // Determine the target column based on the note's databaseProperties
      const targetColIndex = newCols.findIndex((col) => {
        const updatedValue = updatedNote.databaseProperties?.[col.propId];

        if (!updatedValue) return false;
        console.log("printing the optionName and updatedValue", col.optionName, updatedValue);
        return updatedValue === col.optionName;
      });

      if (targetColIndex !== -1) {
        const targetCol = newCols[targetColIndex];
        if (targetCol) {
          newCols[targetColIndex] = {
            ...targetCol,
            cards: [...targetCol.cards, updatedNote],
          };
        }
      } else {
        console.warn("No target column found for updated note!", updatedNote);
      }

      console.log("Updated Columns:", newCols);
      return newCols;
    });
    console.log("Updated Task", updatedNote);
    setSelectedTask(updatedNote);
  };

  const handleColumnDrop = async (columns: Column[], board: ViewCollection) => {
    const newOrder = columns.map((c) => c.id);
    console.log("Final order:", newOrder);

    try {
      // find status propertyId
      const statusPropId = Object.entries(boardProperties).find(
        ([_, prop]) => prop.type === "status" && prop.default,
      )?.[0];

      if (!statusPropId || !boardProperties?.[statusPropId]) {
        console.error("No status property found");
        return;
      }

      const statusProp = boardProperties[statusPropId];
      if (!statusProp || !Array.isArray(statusProp.options)) {
        console.error("Status property has no options");
        return;
      }

      const updatedOptions = newOrder
        .map((id) => statusProp.options!.find((opt) => opt.id === id))
        .filter((opt): opt is BoardPropertyOption => Boolean(opt));

      // Get dataSourceId helper from current view ID (not type)
      // IMPORTANT: Always match by view ID first, only use type as fallback
      const getCurrentDataSourceId = (): string | null => {
        const cv = currentView[board._id];
        const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
        
        let v;
        if (cv?.id) {
          // Prioritize ID match - if cv.id exists, ONLY match by ID
          v = latestBoard.viewsType?.find((vt) => vt.id === cv.id);
        } else if (cv?.type) {
          // Only fallback to type if no ID is available
          v = latestBoard.viewsType?.find((vt) => vt.viewType === cv.type);
        }
        
        const dsId = v?.databaseSourceId;
        return dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
      };

      // make API call
      const result = await handleReorderPropertyOptions(
        board,
        statusPropId,
        statusProp.name,
        updatedOptions,
        getCurrentDataSourceId,
      );

      // Update data source in context from API response
      if (result?.dataSource) {
        const ds = result.dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
        if (dsId) {
          setDataSource(dsId, ds);
        }
      }

      // ✅ Update data source properties in context (fallback if dataSource not in response)
      const dataSourceId = currentDataSource[board._id];
      if (dataSourceId && dataSources[dataSourceId] && statusPropId && result?.properties) {
        const currentDs = dataSources[dataSourceId];
        const updatedProps = {
          ...(currentDs.properties || {}),
          [statusPropId]: {
            ...statusProp,
            options: updatedOptions,
          },
        };
        updateDataSource(dataSourceId, { properties: updatedProps });
      }

      console.log("Order saved to backend!", updatedOptions);
    } catch (err) {
      console.error("Failed to save order:", err);
    }
  };

  const updateNoteTitleLocally = (noteId: string, newTitle: string) => {
    const noteToUpdate = notes.find((note) => note._id === noteId);
    const updatedNote = noteToUpdate ? { ...noteToUpdate, title: newTitle } : null;

    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((card) => (card._id === noteId ? { ...card, title: newTitle } : card)),
      })),
    );

    // Update sidebar if this note is open
    if (selectedTask?._id === noteId) {
      setSelectedTask((prev) => (prev ? { ...prev, title: newTitle } : prev));
    }

    // Update context immediately for real-time sync
    if (updatedNote) {
      const currentDsId = getCurrentDataSourceId();
      if (currentDsId) {
        updateNote(currentDsId, noteId, updatedNote);
      }
    }
  };

  const persistNoteTitleChange = async (noteId: string, newTitle: string) => {
    // Find the columnId of the note
    const column = columns.find((col) => col.cards.some((card) => card._id === noteId));

    if (column) {
      handleEditCard(column.id, noteId, newTitle);
    } else {
      console.warn("Column not found for note", noteId);
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start gap-4">
        {columns.map((col) => (
          <Draggable
            key={col.id}
            id={col.id}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDrop={() => handleColumnDrop(columns, board)}
          >
            <div
              key={col.id}
              className="relative flex flex-col rounded-lg border w-64 shadow-sm dark:border-[rgb(42,42,42)] "
              style={{ backgroundColor: col.bgColor }}
            >
              {/* Column header */}
              <div
                className="flex items-center px-3 py-2 rounded-t-lg sticky top-0 z-10"
                style={{ backgroundColor: col.bgColor }}
              >
                <div
                  className="inline-flex items-center px-2 py-1 rounded-lg text-sm font-medium"
                  style={{ color: col.textColor, background: col.badgeColor }}
                >
                  <div className="mr-1 h-2 w-2 rounded-full" style={{ backgroundColor: col.dotColor }} />
                  {col.title}
                </div>
                <span className="ml-2 text-sm" style={{ color: col.dotColor }}>
                  {col.cards.length}
                </span>

                {/* TOP ACTIONS on each group */}
                <div className="ml-auto flex items-center space-x-1">
                  <button className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
                    <EllipsisIcon fill={col.dotColor} className="mr-2 h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowAddInput(col.id)}
                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                  >
                    <PlusIcon fill={col.dotColor} className="mr-2 h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Cards */}
              <div
                className="flex flex-col gap-2 px-3 py-2"
                onDragOver={(e) => {
                  e.preventDefault();
                  handleColumnDragOver(col.id); // 👈 works even if empty
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleNoteDrop();
                }}
              >
                {col.cards.map((card, idx) => (
                  <NoteDraggable
                    key={card._id ?? card._id ?? `temp-${idx}`}
                    noteId={card._id}
                    columnId={col.id}
                    onDragStart={handleNoteDragStart}
                    onDragOver={handleNoteDragOver}
                    onDrop={handleNoteDrop}
                  >
                    <div
                      key={card._id ?? card._id ?? `temp-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(card);
                      }}
                      className={activeNote?.noteId === card._id ? "opacity-50" : ""}
                    >
                      <BoardCard
                        card={card}
                        board={board}
                        onEdit={(newTitle) => handleEditCard(col.id, card._id, newTitle)}
                        onDelete={() => handleDeleteCard(col.id, card._id)}
                        onOpenSidebar={async (card) => {
                          handleCardClick(card);
                          setCurrentBoardNoteId(card._id);
                        }}
                        updateNoteTitleLocally={updateNoteTitleLocally}
                        columnColors={{
                          dotColor: col.dotColor,
                          textColor: col.textColor,
                          bgColor: col.bgColor,
                          badgeColor: col.badgeColor,
                        }}
                      />
                    </div>
                  </NoteDraggable>
                ))}
                {/* 👇 Optional placeholder when column is empty */}
                {/* {col.cards.length === 0 && (
                      <div className="p-4 text-sm text-gray-400 border border-dashed rounded">
                        Drop here
                      </div>
                    )} */}
                {/* Add new card */}
                {showAddInput === col.id ? (
                  <div className="p-2 bg-white rounded shadow">
                    <input
                      type="text"
                      placeholder="Enter card title..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-[rgb(42,42,42)] "
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddPageClick(col.id, (e.target as HTMLInputElement).value.trim());
                        } else if (e.key === "Escape") {
                          setShowAddInput(null);
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          handleAddPageClick(col.id, e.target.value.trim());
                        } else {
                          setShowAddInput(null);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => handleAddPageClick(col.id)}
                    className="inline-flex items-center h-8 px-2 rounded-lg text-sm hover:bg-muted transition-colors"
                    style={{ color: col.dotColor }}
                  >
                    <PlusIcon className="mr-2 h-4 w-4" fill={col.dotColor} />
                    New page
                  </button>
                )}
              </div>
            </div>
          </Draggable>
        ))}
      </div>
      {currentSelectedTask && (
        <RightSidebar
          note={currentSelectedTask}
          board={board}
          initialContent={rightSidebarContent}
          onClose={handleCloseSidebar}
          isClosing={isClosing}
          onUpdate={handleUpdate}
          updateNoteTitleLocally={updateNoteTitleLocally}
          persistNoteTitleChange={persistNoteTitleChange}
        />
      )}
    </div>
  );
}
