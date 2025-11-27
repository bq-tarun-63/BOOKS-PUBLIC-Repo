import { useState, useCallback } from "react";
import { Note, ViewCollection } from "@/types/board";
import { postWithAuth } from "@/lib/api-helpers";
import { useBoard } from "@/contexts/boardContext";

interface UseDragDropNotesProps {
    board: ViewCollection;
    notes: Note[];
    setLocalNotes: React.Dispatch<React.SetStateAction<Note[]>>;
    primaryDateProperty: string;
}

interface DragDropHandlers {
    draggedNote: Note | null;
    dragOverTarget: string | null;
    handleDragStart: (e: React.DragEvent, note: Note) => void;
    handleDragEnd: (e: React.DragEvent) => void;
    handleDragOver: (e: React.DragEvent, target: string | Date) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, targetDate: Date | string, customValue?: string) => Promise<void>;
    isDragging: (noteId: string) => boolean;
    isDropTarget: (target: string) => boolean;
}

export default function useDragDropNotes({
    board,
    notes,
    setLocalNotes,
    primaryDateProperty,
}: UseDragDropNotesProps): DragDropHandlers {
    const [draggedNote, setDraggedNote] = useState<Note | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
    const { updateNote, currentView, boards } = useBoard();

    const handleDragStart = useCallback((e: React.DragEvent, note: Note) => {
        setDraggedNote(note);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', note._id);
        
        // Add a subtle opacity to the dragged element
        if (e.target instanceof HTMLElement) {
            e.target.style.opacity = '0.5';
        }
    }, []);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        setDraggedNote(null);
        setDragOverTarget(null);
        
        // Restore opacity
        if (e.target instanceof HTMLElement) {
            e.target.style.opacity = '1';
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, target: string | Date) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Convert target to string for consistent handling
        const targetString = target instanceof Date ? target.toDateString() : target;
        setDragOverTarget(targetString);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {

        // Only clear drag over state if we're leaving the drop zone entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverTarget(null);
        }
    }, []);

    const handleDrop = useCallback(async (
        e: React.DragEvent, 
        targetDate: Date | string, 
        customValue?: string
    ) => {
        e.preventDefault();
        setDragOverTarget(null);
        
        if (!draggedNote) return;

        // Determine the target date string based on input type
        let targetDateString: string;
        
        if (customValue) {
            targetDateString = customValue;
        } else if (targetDate instanceof Date) {
            targetDateString = targetDate.toLocaleDateString("en-CA");
        } else {
            targetDateString = targetDate;
        }

        const currentDateString = draggedNote.databaseProperties?.[primaryDateProperty];
        
        // Don't update if dropping on the same date/value
        if (currentDateString === targetDateString) {
            setDraggedNote(null);
            return;
        }

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
          setDraggedNote(null);
          return;
        }
        const normalizedDsId = typeof dataSourceId === "string" ? dataSourceId : String(dataSourceId);

        // Store previous state for rollback
        const previousNote = draggedNote;

        // Optimistically update the local state
        const updatedNote = {
            ...draggedNote,
            databaseProperties: {
                ...draggedNote.databaseProperties,
                [primaryDateProperty]: targetDateString
            }
        };

        setLocalNotes(prevNotes =>
            prevNotes.map(note =>
                note._id === draggedNote._id ? updatedNote : note
            )
        );

        // Update context optimistically
        updateNote(normalizedDsId, draggedNote._id, updatedNote);

        try {
        // Update via API
        const res = await postWithAuth(`/api/database/updatePropertyValue`, {
            dataSourceId: normalizedDsId,
            viewId: board._id, // Optional for audit
            pageId: draggedNote._id,
            propertyId: primaryDateProperty,
            value: targetDateString,
        });
        
        if (!res.success) {
            throw new Error("Failed to update property value");
        }
        
        const syncedNote: Note = {
            ...draggedNote,
            title: res.page.title,
            databaseProperties: {
            ...draggedNote.databaseProperties,
            ...res.page.databaseProperties,
            },
        };
        
        // Update with server response
        updateNote(normalizedDsId, draggedNote._id, syncedNote);
        
        console.log(
            `Moved note "${draggedNote.title}" to ${targetDateString}`
        );
        } catch (err) {
        console.error("Failed to update note date:", err);
        
        // Roll back optimistic update
        setLocalNotes((prevNotes) =>
            prevNotes.map((note) =>
            note._id === draggedNote._id ? previousNote : note
            )
        );
        updateNote(normalizedDsId, draggedNote._id, previousNote);
        }

        setDraggedNote(null);
    }, [draggedNote, primaryDateProperty, board._id, setLocalNotes, updateNote]);

    const isDragging = useCallback((noteId: string) => {
        return draggedNote?._id === noteId;
    }, [draggedNote]);

    const isDropTarget = useCallback((target: string) => {
        return dragOverTarget === target;
    }, [dragOverTarget]);

    return {
        draggedNote,
        dragOverTarget,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        isDragging,
        isDropTarget,
    };
}