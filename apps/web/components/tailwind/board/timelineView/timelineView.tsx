"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { Note, ViewCollection } from "@/types/board";
import { useBoard } from "@/contexts/boardContext";
import TimelineHeader from "./timelineHeader";
import TimelineGrid from "./timelineGrid";
import RightSidebar from "../rightSidebar";
import { JSONContent } from "novel";
import useAddRootPage from "@/hooks/use-addRootPage";
import { toast } from "sonner";
import useNoteActions from "@/hooks/use-updateNode";
import useBoardFunctions from "@/hooks/use-board";

interface TimelineViewProps {
  board: ViewCollection;
  notes: Note[];
}

export default function TimelineView({ board, notes }: TimelineViewProps) {
  const [selectedTask, setSelectedTask] = useState<Note | null>(null);
  const { updateNote, updateAllNotes, getCurrentDataSourceProperties, currentView, boards, currentDataSource } = useBoard();
  
  // Get current dataSourceId from current view ID (not type)
  // IMPORTANT: Always match by view ID first, only use type as fallback
  const getCurrentDataSourceId = (): string | null => {
    const currentViewData = currentView[board._id];
    const latestBoard = boards.find((b) => b._id === board._id) || board;
    
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
  const { UpdateNote } = useNoteActions();
  const { addRootPage } = useAddRootPage();
  const { DeleteNote} = useNoteActions();
  
  // Get properties from current data source
  const boardProperties = getCurrentDataSourceProperties(board._id) || board.properties;  

  const LEFT_LABEL_WIDTH = 40; // px — exact pixel value used for both header label & scroller spacer
  const dayWidth = 48; // px
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [rightSidebarContent, setRightSidebarContent] = useState<JSONContent | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const previousCardIdRef = useRef<string | null>(null);
  
  
  const {
    handleCardClick,
    handleCloseSidebar,
} = useBoardFunctions({
    board,
    setSelectedTask,
    setRightSidebarContent,
    setIsClosing,
    previousCardIdRef,
});

  const datePropertyName = Object.entries(boardProperties).find(
    ([_, prop]) => prop.type === "date"
  )?.[0];

  function formatLocalDate(date: Date | string): string {
    let d: Date;
    if (typeof date === "string") {
      const parts = date.split("-").map(Number);
      const yyyy = parts[0] ?? 1970;
      const mm = parts[1] ?? 1; 
      const dd = parts[2] ?? 1; 
        console.log("Parts ---->",parts)
      d = new Date(yyyy, mm - 1, dd);
    } else {
      d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Keep a local copy of notes that belong to timeline (filter notes with date property).
  const [localNotes, setLocalNotes] = useState<Note[]>(() =>
    datePropertyName ? notes.filter((n) => !!n.databaseProperties[datePropertyName]) : []
  );

  const currentSelectedTask = useMemo(() => {
    if (!selectedTask) return null;
    
    // Find the current note data from localNotes
    const foundNote = localNotes.find(note => note._id === selectedTask._id);
    if (foundNote) {
      return foundNote;
    }
    
    return selectedTask;
  }, [selectedTask, localNotes]);

  // Map notes by date property (local YYYY-MM-DD)
  const timelineNotes: Note[] = useMemo(() => {
    if (!datePropertyName) return [];
    return notes.filter((note) => note.databaseProperties[datePropertyName]);
  }, [notes, datePropertyName]);

  // sync when incoming notes prop changes (e.g. server updates)
  useEffect(() => {
    if (!datePropertyName) return;
    setLocalNotes(notes.filter((n) => !!n.databaseProperties[datePropertyName]));
  }, [notes, datePropertyName]);


  // Dates range
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // local midnight
  const daysToRender = 30;
  const dateRange = useMemo(() => {
    const arr: string[] = [];
    for (let i = -daysToRender; i <= daysToRender; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(formatLocalDate(d));
    }
    return arr;
  }, [today]);

  // sync scrollLeft
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const left = scrollRef.current.scrollLeft;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setScrollLeft(left));
  };

  // center today initially
  useEffect(() => {
    if (!scrollRef.current) return;
    const centerIndex = dateRange.findIndex((d) => d === formatLocalDate(today));
    const index = centerIndex >= 0 ? centerIndex : Math.floor(dateRange.length / 2);
    const target = index * dayWidth - (scrollRef.current.clientWidth / 2) + dayWidth / 2;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ left: Math.max(0, target) });
      setScrollLeft(scrollRef.current?.scrollLeft ?? 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollRef.current, dateRange.length]);

  useEffect(() => {
    console.log("Printing local Notes ", localNotes);
  },[localNotes])

  const currentIndex = Math.max(0, Math.min(dateRange.length - 1, Math.floor(scrollLeft / dayWidth)));
  // total content width for overlays (spacer + days)
  const totalContentWidth = LEFT_LABEL_WIDTH + dateRange.length * dayWidth;
  

  const handleAddPage = async (dateKey: string) => {
    console.log("Date Property Name ----->",datePropertyName);
    setPendingDate(dateKey); // highlight immediately
    // dateKey is YYYY-MM-DD
    if (!datePropertyName) {
      console.warn("No date property defined on the board");
      return;
    }

    console.log("222 -->", datePropertyName, dateKey);
    // create an optimistic note
    const tempId = "temp-" + Date.now();
    const optimistic: Note = {
      _id: tempId,
      title: "New Task",
      content: "",
      description: "",
      noteType: "Viewdatabase_Note",
      databaseProperties: {
        [datePropertyName]: dateKey,
      },
      contentPath: "",
      commitSha: "",
      comments: [],
    };

    console.log("333 -->", optimistic)

    // add locally
    setLocalNotes((prev) => [...prev, optimistic]);

    try {
      // Get dataSourceId from context (already tracked and synced)
      const dsId = currentDataSource[board._id];
      const dataSourceId: string | undefined = (dsId ? String(dsId) : board._id) as string | undefined;

      // Build databaseProperties object (only if both datePropertyName and dateKey exist, matching old behavior)
      const databaseProperties = datePropertyName && dateKey ? { [datePropertyName]: dateKey } : {};
      
      const { page, error } = await addRootPage(
        "New Task",                   // title
        null,                    // parentId
        false,                   // isRestrictedPage
        null,                    // icon
        false,                   // isPublicNote
        dataSourceId,            // dataSourceId instead of board._id
        databaseProperties,      // databaseProperties
      );
    
        if (error) {
          throw new Error(error);
        }
        console.log("Printing new timeline Page ->", page);
        const serverNote: Note = {
          _id: page.id,
          title: page.title,
          content: page.content,
          description: page.description || "",
          noteType: page.noteType || "viewDatabase_note",
          databaseProperties: page.databaseProperties || {},
          contentPath: page.contentPath || "",
          commitSha: page.commitSha || "",
          comments: page.comments || [],
        };
    
      // replace temp with server result
      setLocalNotes((prev) =>
        prev.map((n) => (n._id === tempId ? serverNote : n))
      );    

      // ✅ also update board context
      const currentDsId = getCurrentDataSourceId();
      if (currentDsId) {
        updateAllNotes(currentDsId, [...notes, serverNote]);
      }

      setPendingDate(null);
    } catch (err) {
      console.error("Failed to create page:", err);
      // remove optimistic
      setLocalNotes((prev) => prev.filter((n) => n._id !== tempId));
      toast.error("Failed to create Page !!");
      setPendingDate(null);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    let deletedNote: Note | undefined;

    // Optimistically remove locally
    setLocalNotes((prev) => {
      deletedNote = prev.find((n) => n._id === noteId);
      return prev.filter((n) => n._id !== noteId);
    });

  
    try {
      const res = await DeleteNote(noteId);

      const dataSourceId = getCurrentDataSourceId();
      if (dataSourceId) {
        updateAllNotes(dataSourceId, notes.filter((n) => n._id !== noteId));
      }

    } catch (err) {
      console.error("Failed to delete note:", err);
      // Rollback if API fails
      toast.error("Error in deleting Note ");
      if (deletedNote) {
        setLocalNotes((prev) => [...prev, deletedNote!]);
      }      
    }
  };

  // edit card 
  const handleEditCard = async (noteId: string, newTitle: string) => {
    
    let prevNotes: Note[] = [];

    //optimistically update the local notes for timeline View
    setLocalNotes((prev) => { 
      prevNotes = prev;
      return prev.map((n) => n._id === noteId ? {...n , title: newTitle} : n )
    })

    try {
        const res = await UpdateNote(noteId, newTitle, null, "");

        const noteToUpdate = notes.find((note) => note._id === noteId);

        // update the note in the board context
        if (noteToUpdate) {
            const updatedNote = { ...noteToUpdate, title: newTitle };
            const dataSourceId = getCurrentDataSourceId();
            if (dataSourceId) {
              updateNote(dataSourceId, noteId, updatedNote);
            }
        }
    } catch (err) {
        console.error("Failed to update task:", err);
        toast.error("Error in updating the Name !")
        setLocalNotes(prevNotes);
    }
};

  const handleUpdateNote = async(updatedNote: Note) => {
  
    if (updatedNote.title !== selectedTask?.title) {
      await handleEditCard(updatedNote._id, updatedNote.title);
    }
  
    setLocalNotes(prevNotes => 
        prevNotes.map(note => 
            note._id === updatedNote._id ? updatedNote : note
        )
    );

    // Update context to ensure sync
    const dataSourceId = getCurrentDataSourceId();
    if (dataSourceId) {
      updateNote(dataSourceId, updatedNote._id, updatedNote);
    }

    console.log("Updated Task", updatedNote);
    setSelectedTask(updatedNote);
  }

  return (
    <div className="relative w-full">
      <TimelineHeader
        dateRange={dateRange}
        dayWidth={dayWidth}
        scrollLeft={scrollLeft}
        leftLabelWidth={LEFT_LABEL_WIDTH}
        hoveredDate={hoveredDate}
      />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseLeave={() => setHoveredDate(null)} 
        className="w-full overflow-x-auto no-scrollbar min-h-32 relative"
        style={{ whiteSpace: "nowrap" }}
      >
        {/* weekend background + spacer — uses same coordinate space as the scrolled content */}
        <div
          className="absolute top-0 left-0 z-0 h-full pointer-events-none flex"
          style={{ width: totalContentWidth }}
        >
          {/* spacer in weekend-bg to align with the fixed left label */}
          <div style={{ minWidth: LEFT_LABEL_WIDTH, width: LEFT_LABEL_WIDTH }} className="flex-shrink-0" />
          {dateRange.map((date) => {
            const parts = date.split("-").map(Number);
            const yyyy = parts[0] ?? 1970;
            const mm = parts[1] ?? 1; 
            const dd = parts[2] ?? 1; 
            const dow = new Date(yyyy, mm - 1, dd).getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isPending = pendingDate === date;
            const isHovered = hoveredDate === date;

            return (
              <div
                key={date}
                style={{ minWidth: dayWidth, width: dayWidth }}
                onMouseEnter={() => {
                  console.log("onMouseEnter  -->", date);
                  setHoveredDate(date)
                }}
                onMouseLeave={() => {
                  console.log("onMouseLeave --->")
                  setHoveredDate(null)
                }}
                onClick={() => handleAddPage(date)} 
                className={`h-full flex-shrink-0 cursor-pointer 
                  ${isWeekend ? "bg-gray-100/50" : ""}
                  ${isHovered ? "bg-gray-200/40" : ""}
                  ${isPending ? "bg-gray-300/50 animate-pulse" : ""}`}
              />
            );
          })}
        </div>

        {/* Grid (with an internal spacer to align under the fixed left label) */}
        <TimelineGrid
          notes={localNotes}
          dateRange={dateRange}
          dayWidth={dayWidth}
          board={board}
          leftLabelWidth={LEFT_LABEL_WIDTH}
          scrollerRef={scrollRef}
          onTaskClick={handleCardClick}
          onAddTask={handleAddPage}
          onHoverDate={setHoveredDate}
          onDeleteNote={handleDeleteNote}
          setLocalNotes={setLocalNotes}
        />
        
      </div>

      {currentSelectedTask && (
        <RightSidebar
          note={currentSelectedTask}
          initialContent={rightSidebarContent}
          board={board}
          onClose={handleCloseSidebar}
          isClosing={isClosing}
          onUpdate={(updatedNote) => {
            setSelectedTask(updatedNote);
            handleUpdateNote(updatedNote)
          }}
        />
      )}
    </div>
  );
}
