import type { NoteResponse } from "@/types/advance-editor";
import { useCallback, useState } from "react";
import { useApiDelete, useApiGet, useApiPost, useApiPut } from "./use-api";

// Query keys for React Query
export const noteKeys = {
  all: ["notes"] as const,
  lists: () => [...noteKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...noteKeys.lists(), filters] as const,
  details: () => [...noteKeys.all, "detail"] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
};

// Interface for note content
interface NoteContent {
  online_content: any;
  online_content_time: string;
}

// Interface for note update
interface NoteUpdate {
  id?:string;
  title?: string;
  content?: NoteContent;
  icon?: string;
  coverUrl?: string | null;
  parentId?: string | null;
  isPublicNote?: boolean;
  isRestrictedPage?: boolean;
}

/**
 * Custom hook for note operations
 */
export function useNotes() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Get a note by ID
   * @param noteId - Note ID
   * @param includeContent - Whether to include content in response
   * @param commitSha - Optional commit SHA
   * @param commitPath - Optional commit path
   */
  const getNote = (noteId: string, includeContent = true, commitSha = "", commitPath = "") => {
    const headers: Record<string, string> = {
      "include-content": includeContent ? "true" : "false",
    };

    if (commitSha) headers.commitSha = commitSha;
    if (commitPath) headers.commitPath = commitPath;

    return useApiGet<NoteResponse>(
      noteKeys.detail(noteId),
      `/api/note/getNote/${noteId}`,
      { headers },
      {
        staleTime: includeContent ? 10000 : 30000, // Content is stale after 10s, metadata after 30s
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
      },
    );
  };

  /**
   * Update a note
   * @param noteId - Note ID
   */
  const updateNote = useApiPut<NoteResponse, NoteUpdate>(
    "/api/note/updateNote",
    {
      onMutate: () => setIsLoading(true),
      onSettled: () => setIsLoading(false),
      onError: (err) => setError(err),
    },
    [noteKeys.all], // Invalidate all note queries on update
  );

  /**
   * Update note title
   * @param noteId - Note ID
   * @param title - New title
   * @param parentId - Parent ID
   * @param icon - Icon
   * @param coverUrl - Cover URL
   */
  const updateNoteTitle = useCallback(
    async (noteId: string, title: string, parentId: string | null, icon: string | null, coverUrl?: string | null) => {
      setIsLoading(true);
      try {
        await updateNote.mutateAsync({
          id: noteId,
          title,
          parentId,
          icon: icon || "",
          coverUrl: coverUrl || null,
        });

        // Update local storage for optimistic notes
        const pendingTitleObj = {
          newTitle: title,
          parentId,
          titleIcon: icon,
          coverUrl: coverUrl || null,
        };
        localStorage.setItem(`pending-title-${noteId}`, JSON.stringify(pendingTitleObj));

        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to update note title"));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [updateNote],
  );

  /**
   * Create a new note
   */
  const createNote = useApiPost<
    NoteResponse,
    {
      title: string;
      parentId?: string | null;
      isRestrictedPage?: boolean;
      icon?: string | null;
      isPublicNote?: boolean;
    }
  >(
    "/api/note/createNote",
    {
      onMutate: () => setIsLoading(true),
      onSettled: () => setIsLoading(false),
      onError: (err) => setError(err),
    },
    [noteKeys.lists()], // Invalidate note lists on create
  );

  /**
   * Delete a note
   */
  const deleteNote = useApiDelete<{ success: boolean }>(
    "/api/note/deleteNote",
    {
      onMutate: () => setIsLoading(true),
      onSettled: () => setIsLoading(false),
      onError: (err) => setError(err),
    },
    [noteKeys.all], // Invalidate all note queries on delete
  );

  return {
    getNote,
    updateNote: updateNoteTitle,
    createNote,
    deleteNote,
    isLoading,
    error,
  };
}

/**
 * Custom hook for note children operations
 */
export function useNoteChildren() {
  /**
   * Get children for a parent node
   * @param parentId - Parent node ID
   */
  const getChildren = (parentId: string) => {
    return useApiGet<any>(
      [...noteKeys.detail(parentId), "children"],
      `/api/note/getNote/${parentId}`,
      {},
      {
        staleTime: 30000, // Children data is stale after 30s
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
      },
    );
  };

  return { getChildren };
}
