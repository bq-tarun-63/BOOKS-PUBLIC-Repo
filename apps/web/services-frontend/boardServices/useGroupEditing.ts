"use client";

import { useCallback, useState } from "react";
import type { Note } from "@/types/board";
import { postWithAuth } from "@/lib/api-helpers";
import useNoteActions from "@/hooks/use-updateNode";
import { toast } from "sonner";
import { useBoard } from "@/contexts/boardContext";

export interface EditingCellPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface SetEditingCellArgs {
  noteId: string;
  propertyId: string;
  position: EditingCellPosition;
}

interface UseGroupEditingOptions {
  boardId: string;
  localNotes: Note[];
  setLocalNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  updateNote: (boardId: string, noteId: string, updatedNote: Note) => void;
  updateAllNotes?: (boardId: string, notes: Note[]) => void;
  onNoteDeleted?: (noteIds: string[]) => void;
}

export function useGroupEditing(options: UseGroupEditingOptions) {
  const { boardId, localNotes, setLocalNotes, updateNote, updateAllNotes, onNoteDeleted } = options;
  const { DeleteNote } = useNoteActions();
  const { currentView, boards } = useBoard();
  
  // Helper to get dataSourceId from current view ID (not type)
  const getCurrentDataSourceId = (): string | null => {
    const currentViewData = currentView[boardId];
    const latestBoard = boards.find((b) => b._id === boardId);
    if (!latestBoard) return null;
    const view = latestBoard.viewsType?.find((vt) => 
      (currentViewData?.id && vt.id === currentViewData.id) || 
      (!currentViewData?.id && vt.viewType === currentViewData?.type)
    );
    const dsId = view?.databaseSourceId;
    return dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
  };
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [groupEditingPropertyId, setGroupEditingPropertyId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<{ noteIds: string[]; count: number } | null>(null);

  const handleSelectNote = useCallback((noteId: string) => {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((allNotes: Note[]) => {
    if (selectedNotes.size === allNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(allNotes.map((n) => n._id)));
    }
  }, [selectedNotes]);

  const openGroupEditor = useCallback((propertyId: string, anchorEl: HTMLElement, setEditingCell: (cell: SetEditingCellArgs) => void) => {
    if (selectedNotes.size === 0) return;
    const firstSelectedId = Array.from(selectedNotes)[0]!;
    const rect = anchorEl.getBoundingClientRect();
    setGroupEditingPropertyId(propertyId);
    setEditingCell({
      noteId: firstSelectedId,
      propertyId,
      position: {
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  }, [selectedNotes]);

  const clearGroupEditing = useCallback(() => {
    setGroupEditingPropertyId(null);
  }, []);

  const applyGroupUpdate = useCallback(async (propertyId: string, value: any) => {
    const ids = Array.from(selectedNotes);
    if (ids.length === 0) return;

    setLocalNotes((prev) =>
      prev.map((n) =>
        ids.includes(n._id)
          ? { ...n, databaseProperties: { ...n.databaseProperties, [propertyId]: value } }
          : n,
      ),
    );

    ids.forEach((id) => {
      const note = localNotes.find((n) => n._id === id);
      if (note) {
        updateNote(boardId, id, {
          ...note,
          databaseProperties: { ...note.databaseProperties, [propertyId]: value },
        });
      }
    });

    // Get dataSourceId from current view ID (not type)
    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      toast.error("Data source not found for current view!");
      return;
    }

    await Promise.all(
      ids.map((id) =>
        postWithAuth(`/api/database/updatePropertyValue`, {
          dataSourceId: dataSourceId,
          viewId: boardId, // Optional for audit
          pageId: id,
          propertyId,
          value,
        }),
      ),
    );

    setGroupEditingPropertyId(null);
  }, [selectedNotes, localNotes, setLocalNotes, updateNote, boardId]);

  // Show delete confirmation modal
  const requestDeleteSelected = useCallback(() => {
    if (selectedNotes.size === 0) return;
    // Store pending deletion info so modal can show correct count
    const noteIds = Array.from(selectedNotes);
    setPendingDeletion({ noteIds, count: noteIds.length });
    setShowDeleteConfirm(true);
  }, [selectedNotes]);

  const confirmDeleteSelected = useCallback(async () => {
    // Use pending deletion info or current selection
    const noteIdsToDelete = pendingDeletion?.noteIds || Array.from(selectedNotes);
    if (noteIdsToDelete.length === 0) return;

    const previousNotes = [...localNotes];

    setShowDeleteConfirm(false);
    setIsDeleting(true);

    // Optimistically remove notes from local state immediately
    setLocalNotes((prev) => prev.filter((note) => !noteIdsToDelete.includes(note._id)));

    setSelectedNotes(new Set());
    setGroupEditingPropertyId(null);

    // Call callback to handle sidebar closure if needed
    if (onNoteDeleted) {
      onNoteDeleted(noteIdsToDelete);
    }

    // Delete each note via API in background
    let successCount = 0;
    const failedNoteIds: string[] = [];

    try {
      // Delete all notes in parallel
      const deletePromises = noteIdsToDelete.map(async (noteId) => {
        try {
          const deleteResult = await DeleteNote(noteId);
          if (deleteResult) {
            return { noteId, success: true };
          } else {
            return { noteId, success: false };
          }
        } catch (err) {
          console.error(`Failed to delete note ${noteId}:`, err);
          return { noteId, success: false };
        }
      });

      const results = await Promise.all(deletePromises);

      // Count successes and failures
      results.forEach((result) => {
        if (result.success) {
          successCount++;
        } else {
          failedNoteIds.push(result.noteId);
        }
      });

      // Calculate remaining notes: keep notes that weren't deleted OR that failed to delete
      const remainingNotes = previousNotes.filter(
        (note) => !noteIdsToDelete.includes(note._id) || failedNoteIds.includes(note._id),
      );

      // Update board context if updateAllNotes is provided
      if (updateAllNotes) {
        updateAllNotes(boardId, remainingNotes);
      }

      // Show appropriate toast message
      if (failedNoteIds.length === 0) {
        toast.success(`${successCount} ${successCount === 1 ? "task" : "tasks"} deleted successfully`);
      } else {
        toast.error(`Failed to delete ${failedNoteIds.length} ${failedNoteIds.length === 1 ? "task" : "tasks"}`);
        // Rollback failed deletions - add back notes that failed to delete
        const failedNotes = previousNotes.filter((note) => failedNoteIds.includes(note._id));
        setLocalNotes((prev) => [...prev, ...failedNotes]);
      }
    } catch (err) {
      console.error("Failed to delete notes:", err);
      toast.error("Failed to delete tasks");
      // Rollback all deletions on error
      setLocalNotes(previousNotes);
    } finally {
      setIsDeleting(false);
      setPendingDeletion(null);
    }
  }, [pendingDeletion, selectedNotes, localNotes, setLocalNotes, boardId, DeleteNote, updateAllNotes, onNoteDeleted]);

  const cancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setPendingDeletion(null);
  }, []);

  return {
    selectedNotes,
    setSelectedNotes,
    groupEditingPropertyId,
    handleSelectNote,
    handleSelectAll,
    openGroupEditor,
    applyGroupUpdate,
    clearGroupEditing,
    requestDeleteSelected,
    confirmDeleteSelected,
    cancelDelete,
    showDeleteConfirm,
    isDeleting,
    pendingDeletion,
  } as const;
}


