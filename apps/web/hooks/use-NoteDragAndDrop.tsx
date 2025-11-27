import { useState } from "react";
import { Column } from "@/components/tailwind/board/boardView/boardView"
import { Note, ViewCollection } from "@/types/board";
import { postWithAuth } from "@/lib/api-helpers";
import { useBoard } from "@/contexts/boardContext";

export const useNoteDragAndDrop = (
  columns: Column[],
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>,
  board: ViewCollection 
) => {
  const [activeNote, setActiveNote] = useState<{
    noteId: string;
    columnId: string;
  } | null>(null);

  const [hoverTarget, setHoverTarget] = useState<{
    noteId?: string;
    columnId: string;
    position?: "above" | "below";
  } | null>(null);

  const { updateNote, currentView, boards } = useBoard(); 

  const handleNoteDragStart = (noteId: string, columnId: string) => {
    setActiveNote({ noteId, columnId });
  };

  const handleNoteDragOver = (targetNoteId: string, targetColumnId: string,  position: "above" | "below"  ) => {
    if (!activeNote) return;
    if (activeNote.noteId === targetNoteId) return;


    setHoverTarget({ noteId: targetNoteId, columnId: targetColumnId, position });

      // setActiveNote({ noteId: activeNote.noteId, columnId: targetColumnId });
  };

  const handleNoteDrop = async () => {
    if (!activeNote || !hoverTarget) return;

    const draggedNote = columns
    .find((col) => col.id === activeNote.columnId)
    ?.cards.find((card) => card._id === activeNote.noteId);

    const targetColumn = columns.find((col) => col.id === hoverTarget.columnId);

    if (!draggedNote || !targetColumn) {
      setActiveNote(null);
      setHoverTarget(null);
      return;
    }

    setColumns((prevCols) => {
      const newCols = [...prevCols];
      let cardToMove: Note | undefined;

      // Remove from old column
      newCols.forEach((col) => {
        if (col.id === activeNote.columnId) {
          const idx = col.cards.findIndex((c) => c._id === activeNote.noteId);
          if (idx !== -1) {
            cardToMove = col.cards[idx];
            col.cards.splice(idx, 1);
          }
        }
      });

        // Insert into new column
      newCols.forEach((col) => {
        if (col.id === hoverTarget.columnId && cardToMove) {
          if (hoverTarget.noteId) {
            const idx = col.cards.findIndex((c) => c._id === hoverTarget.noteId);
            if (idx !== -1) {
              const insertAt = hoverTarget.position === "above" ? idx : idx + 1;
              col.cards.splice(insertAt, 0, cardToMove);
            }
          } else {
            col.cards.push(cardToMove);
          }
        }
      });

      return newCols;
    });

    if (activeNote.columnId === hoverTarget.columnId) {
      // ✅ Same column → reorder only
      console.log("Reorder inside column", hoverTarget.columnId);
      // 🔗 call reorder API
    } else {
      // ✅ Different column → update property
      console.log("Move to another column", {
        noteId: activeNote.noteId,
        from: activeNote.columnId,
        to: hoverTarget.columnId,
        newStatus: targetColumn.optionName,
      });

      const statusPropId = targetColumn.propId;
      const newStatusValue = targetColumn.optionName;

      // Get dataSourceId from current view ID (not type)
      // IMPORTANT: Always match by view ID first, only use type as fallback
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
      
      const dataSourceId = view?.databaseSourceId;
      if (!dataSourceId) {
        console.error("Data source not found for current view");
        setActiveNote(null);
        setHoverTarget(null);
        return;
      }
      const normalizedDsId = typeof dataSourceId === "string" ? dataSourceId : String(dataSourceId);

      // Store previous state for rollback
      const previousNote = draggedNote;
      const previousColumns = columns;

      // Optimistic update: update local state first
      const optimisticNote: Note = {
        ...draggedNote,
        databaseProperties: {
          ...draggedNote.databaseProperties,
          [statusPropId]: newStatusValue,
        },
      };

      setColumns((prevCols) => {
        return prevCols.map((col) => ({
          ...col,
          cards: col.cards.map((card) =>
            card._id === draggedNote._id ? optimisticNote : card
          ),
        }));
      });

      // Update context optimistically
      updateNote(normalizedDsId, draggedNote._id, optimisticNote);

      try {
        const response = await postWithAuth(`/api/database/updatePropertyValue`, {
          dataSourceId: normalizedDsId,
          viewId: board._id, // Optional for audit
          pageId: draggedNote._id,
          propertyId: statusPropId,
          value: newStatusValue,
        });

        if (!response.success) {
          throw new Error("Failed to update property value");
        }

        const updatedNote: Note = {
          ...draggedNote,
          title: response.page.title,
          databaseProperties: {
            ...draggedNote.databaseProperties,
            ...response.page.databaseProperties,
            [statusPropId]: newStatusValue,
          },
        };

        // Update with server response
        updateNote(normalizedDsId, draggedNote._id, updatedNote);

        setColumns((prevCols) => {
          return prevCols.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card._id === draggedNote._id ? updatedNote : card
            ),
          }));
        });

      } catch (error) {
        console.error("Failed to update note status:", error);

        // Rollback optimistic update on error
        updateNote(normalizedDsId, draggedNote._id, previousNote);
        setColumns(previousColumns);
      }
    }

    setActiveNote(null);
    setHoverTarget(null);
  };

  const handleColumnDragOver = (targetColumnId: string) => {
    if (!activeNote) return;

    setHoverTarget({ columnId: targetColumnId });
  };

  return { handleNoteDragStart, handleNoteDragOver, handleNoteDrop, handleColumnDragOver,activeNote };
};
