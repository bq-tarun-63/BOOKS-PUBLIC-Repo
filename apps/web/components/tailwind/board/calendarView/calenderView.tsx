"use client";
import { useBoard } from "@/contexts/boardContext";
import useAddRootPage from "@/hooks/use-addRootPage";
import useBoardFunctions from "@/hooks/use-board";
import useDragDropNotes from "@/hooks/use-cardDragAndDrop";
import useNoteActions from "@/hooks/use-updateNode";
import type { Note, ViewCollection } from "@/types/board";
import { applySorting } from "@/utils/sortingCard";
import { computeRollupData, getRollupComparableValue } from "@/utils/rollupUtils";
import { applyAdvancedFilters } from "@/utils/advancedFilterUtils";
import type { JSONContent } from "novel";
import { useEffect, useMemo, useRef, useState } from "react";
import PlusIcon from "../../ui/icons/plusIcon";
import RightSidebar from "../rightSidebar";
import CalendarCard from "./calenderCard";
import CalendarHeader from "./calenderHeader";

interface CalendarViewProps {
  board: ViewCollection;
  notes: Note[];
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  notes: Note[];
}

export default function CalendarView({ board, notes }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Note | null>(null);
  const [rightSidebarContent, setRightSidebarContent] = useState<JSONContent | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const previousCardIdRef = useRef<string | null>(null);
  const { addRootPage } = useAddRootPage();
  const [localNotes, setLocalNotes] = useState<Note[]>(notes);
  const { UpdateNote, DeleteNote } = useNoteActions();
  const { updateNote, updateAllNotes, getFilters, getAdvancedFilters, getSortBy, searchQuery, getCurrentDataSourceProperties, currentView, boards: contextBoards, getNotesByDataSourceId, getDataSource } = useBoard();
  
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
  
  // Get properties from current data source
  const boardProperties = getCurrentDataSourceProperties(board._id) || board.properties;

  useEffect(() => {
    setLocalNotes(notes);
  }, [board, notes]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const { handleCardClick, handleCloseSidebar } = useBoardFunctions({
    board,
    setSelectedTask,
    setRightSidebarContent,
    setIsClosing,
    previousCardIdRef,
  });

  // Apply filters and search to notes
  const filteredNotes = useMemo(() => {
    let result = localNotes;

    // Apply search query first
    const query = searchQuery[board._id] || "";
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      result = result.filter((note) => {
        const titleMatch = note.title.toLowerCase().includes(searchLower);
        
        return titleMatch;
      });
    }

    // Get current view to access settings for advanced filters
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
      // Apply advanced filters using the utility function, then continue with normal filters
      result = applyAdvancedFilters(
        result,
        advancedFilters,
        boardProperties,
        getNotesByDataSourceId,
        getDataSource
      );
    }

    // Apply property filters for this specific board (using viewTypeId) - regular filters
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
  }, [localNotes, getFilters, board._id, searchQuery[board._id], boardProperties, getNotesByDataSourceId, getDataSource, currentView, contextBoards]);

  const currentSelectedTask = useMemo(() => {
    if (!selectedTask) return null;

    // Find the current note data from localNotes
    const foundNote = filteredNotes.find((note) => note._id === selectedTask._id);
    if (foundNote) {
      return foundNote;
    }

    return selectedTask;
  }, [selectedTask, filteredNotes]);

  // Find date properties in the board
  const dateProperties = useMemo(() => {
    if (!board?.properties) return [];

    return Object.entries(boardProperties)
      .filter(([_, prop]: any) => prop.type === "date")
      .map(([id, prop]: any) => ({ id, name: prop.name }));
  }, [boardProperties]);

  // Get the primary date property (first one found, or create a default)
  const primaryDateProperty = dateProperties[0]?.id || "dueDate";

  const {
    draggedNote,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isDragging,
    isDropTarget,
  } = useDragDropNotes({
    board,
    notes: filteredNotes,
    setLocalNotes,
    primaryDateProperty,
  });

  // Filter and organize notes by date
  const notesByDate = useMemo(() => {
    const filtered = filteredNotes.filter(
      (note) => note.noteType === "Viewdatabase_Note" && note.databaseProperties?.[primaryDateProperty],
    );

    const grouped: { [key: string]: Note[] } = {};

    filtered.forEach((note) => {
      const dateValue = note.databaseProperties?.[primaryDateProperty];
      if (dateValue) {
        const dateKey = new Date(dateValue).toDateString();
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(note);
      }
    });

    // applying sorting setting on cards within each date
    const boardSorts = getSortBy(board._id) || [];
    if (boardSorts.length > 0) {
      Object.entries(grouped).forEach(([dateKey, dateNotes]) => {
        grouped[dateKey] = applySorting(dateNotes, boardSorts, boardProperties, {
          getNotesByDataSourceId,
          getDataSource,
        });
      });
    }

    return grouped;
  }, [filteredNotes, primaryDateProperty, getSortBy, board._id, boardProperties]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Start from the first Sunday before the first day of the month
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End at the last Saturday after the last day of the month
    const endDate = new Date(lastDayOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days: CalendarDay[] = [];
    const today = new Date().toDateString();

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toDateString();
      days.push({
        date: new Date(d),
        isCurrentMonth: d.getMonth() === month,
        isToday: dateKey === today,
        notes: notesByDate[dateKey] || [],
      });
    }

    return days;
  }, [currentDate, notesByDate]);

  // Handle adding new card
  const handleAddNewCard = async (date: Date, title = "New Task") => {
    // Get dataSourceId from current view
    const currentViewData = currentView[board._id];
    const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
    const view = latestBoard.viewsType?.find((vt) => 
      (currentViewData?.id && vt.id === currentViewData.id) || 
      (!currentViewData?.id && vt.viewType === currentViewData?.type)
    );
    const dataSourceId = view?.databaseSourceId || board._id; // Fallback to board._id if no dataSourceId

    // Find date property
    const dateProperties = Object.entries(boardProperties || {}).filter(([_, prop]: any) => prop.type === "date");

    const primaryDateProp = dateProperties[0];
    if (!primaryDateProp) {
      console.error("No date property found in board");
      return;
    }

    const [datePropId] = primaryDateProp;
    const dateString = date.toLocaleDateString("en-CA");

    // temporary note
    const tempId = `temp_${Date.now()}`;
    const tempNote: Note = {
      _id: tempId,
      title,
      description: "",
      noteType: "Viewdatabase_Note",
      databaseProperties: {
        [datePropId]: dateString,
      },
      content: "",
      commitSha: "",
      contentPath: "",
      comments: [],
    };

    setLocalNotes((prevNotes) => [...prevNotes, tempNote]);

    // actual note
    try {
      const currentDataSourceId = getCurrentDataSourceId();
      if (!currentDataSourceId) {
        console.error("No dataSourceId found for current view");
        setLocalNotes((prevNotes) => prevNotes.filter((note) => note._id !== tempId));
        return;
      }
      
      // Build databaseProperties object (only if both datePropId and dateString exist, matching old behavior)
      const databaseProperties = datePropId && dateString ? { [datePropId]: dateString } : {};
      
      const { page: newPage, newPageID } = await addRootPage(
        title,
        null,
        false,
        null,
        false,
        currentDataSourceId,
        databaseProperties,
      );

      setLocalNotes((prevNotes) =>
        prevNotes.map((note) =>
          note._id === tempId
            ? {
                _id: newPage.id,
                title: newPage.title,
                description: newPage.description || "",
                noteType: newPage.noteType || "Viewdatabase_Note",
                databaseProperties: newPage.databaseProperties || {},
                content: newPage.content || "",
                commitSha: newPage.commitSha,
                contentPath: newPage.contentPath || "",
                status: "Todo",
                comments: [],
              }
            : note,
        ),
      );

      if (currentDataSourceId) {
        updateNote(currentDataSourceId, tempId, {
          _id: newPage.id,
          title: newPage.title,
          description: newPage.description || "",
          noteType: newPage.noteType || "Viewdatabase_Note",
          databaseProperties: newPage.databaseProperties || {},
          content: newPage.content || "",
          commitSha: newPage.commitSha,
          contentPath: newPage.contentPath || "",
          comments: [],
        });
      }

      console.log("Created new task for date:", date, newPage);
    } catch (err) {
      console.error("Failed to create task for date:", err);
      setLocalNotes((prevNotes) => prevNotes.filter((note) => note._id !== tempId));
    }
  };

  // edit card
  const handleEditCard = async (noteId: string, newTitle: string) => {
    setLocalNotes((prev) => prev.map((note) => (note._id === noteId ? { ...note, title: newTitle } : note)));

    try {
      await UpdateNote(noteId, newTitle, null, "");
      const noteToUpdate = notes.find((note) => note._id === noteId);

      if (noteToUpdate) {
        const updatedNote = { ...noteToUpdate, title: newTitle };
        const dataSourceId = getCurrentDataSourceId();
        if (dataSourceId) {
          updateNote(dataSourceId, noteId, updatedNote);
        }
      }
    } catch (err) {
      console.error("Failed to update task:", err);
      setLocalNotes(notes);
    }
  };

  // delete card
  const handleDeleteNote = async (noteId: string) => {
    setLocalNotes((prevNotes) => prevNotes.filter((note) => note._id !== noteId));

    try {
      const deleteNote = await DeleteNote(noteId);
      if (deleteNote) {
        const newNotes = notes.filter((note) => note._id !== noteId);
        const dataSourceId = getCurrentDataSourceId();
        if (dataSourceId) {
          updateAllNotes(dataSourceId, newNotes);
        }
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
      setLocalNotes(notes);
    }
  };

  // update card
  const handleUpdate = async (updatedNote: Note) => {
    if (updatedNote.title !== selectedTask?.title) {
      await handleEditCard(updatedNote._id, updatedNote.title);
    }

    setLocalNotes((prevNotes) => prevNotes.map((note) => (note._id === updatedNote._id ? updatedNote : note)));

    // Update context to ensure sync
    const dataSourceId = getCurrentDataSourceId();
    if (dataSourceId) {
      updateNote(dataSourceId, updatedNote._id, updatedNote);
    }

    console.log("Updated Task", updatedNote);
    setSelectedTask(updatedNote);
  };

  return (
    <div className=" w-full max-w-[1200px] min-w-[900px] h-full bg-white dark:bg-background">
      {/* Header */}
      <CalendarHeader currentDate={currentDate} setCurrentDate={setCurrentDate} />

      {/* Calendar Grid */}
      <div className="flex flex-col h-full">
        {/* Week Headers */}
        <div className="grid grid-cols-7">
          {weekDays.map((day) => (
            <div key={day} className="p-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="border rounded-lg dark:border-[#343434]">
          <div className="grid grid-cols-7 flex-1 divide-x divide-gray-200 dark:divide-[#343434]">
            {calendarDays.map((day, index) => {
              const dayString = day.date.toDateString();
              const isDropTargetDay = isDropTarget(dayString);

              return (
                <div
                  key={index}
                  className={`group relative min-h-32 p-2 border-b transition-all !dark:border-b-[#343434] ${
                    !day.isCurrentMonth ? "bg-gray-100 dark:bg-[#202020] " : "bg-white dark:bg-background"
                  } ${day.isToday ? "bg-blue-100 dark:bg-blue-900/20" : ""} transition-colors`}
                  onDragOver={(e) => handleDragOver(e, day.date)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day.date)}
                >
                  {/* Date Number */}
                  <div className="flex items-center justify-between mb-2 pl-1">
                    <div
                      className={`text-sm font-medium ${
                        day.isToday
                          ? "text-blue-600"
                          : day.isCurrentMonth
                            ? "text-gray-900 dark:text-gray-400"
                            : "text-gray-400 dark:text-gray-400"
                      }`}
                    >
                      {day.date.getDate()}
                    </div>

                    {/* Add button on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddNewCard(day.date);
                      }}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                      <PlusIcon className=" h-4 w-4" />
                    </button>
                  </div>

                  {/* Drop indicator */}
                  {isDropTargetDay && (
                    <div className="absolute inset-0 bg-blue-200/50 dark:bg-gray-800/60 pointer-events-none" />
                  )}

                  {/* Notes for this day */}
                  <div className="space-y-1">
                    {day.notes.map((note) => {
                      const noteIsDragging = isDragging(note._id);

                      return (
                        <div
                          key={note._id}
                          draggable={!noteIsDragging}
                          onDragStart={(e) => handleDragStart(e, note)}
                          onDragEnd={handleDragEnd}
                          className={`cursor-move transition-all ${noteIsDragging ? "opacity-50" : ""}`}
                        >
                          <CalendarCard
                            card={note}
                            board={board}
                            onEdit={(newTitle) => handleEditCard(note._id, newTitle)}
                            onDelete={() => handleDeleteNote(note._id)}
                            onClick={handleCardClick}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      {currentSelectedTask && (
        <RightSidebar
          note={currentSelectedTask}
          board={board}
          initialContent={rightSidebarContent}
          onClose={handleCloseSidebar}
          isClosing={isClosing}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
