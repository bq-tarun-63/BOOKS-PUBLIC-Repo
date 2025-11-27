import type { NoteResponse } from "@/types/advance-editor";
import { useNoteContext } from "@/contexts/NoteContext";
import { postWithAuth } from "@/lib/api-helpers";
import { useCallback } from "react";
import type { SyncQueueItem } from "./use-syncQueue";

interface UseUnsavedChangesCheckProps {
  isContentSyncedRef: React.MutableRefObject<boolean>;
  isDirtyRef: React.MutableRefObject<boolean>;
  isTitleDirtyRef: React.MutableRefObject<boolean>;
  updateNote: (id: string, title: string, parentId: string | null, icon: string | null) => Promise<unknown>;
  enqueue: (item: SyncQueueItem) => void;
  dequeue: (noteId: string) => void;
  setShowCreatingOverlay: (v: boolean) => void;
}

interface UseUnsavedChangesCheckResult {
  checkAndHandleUnsavedChanges: (currentEditorKey: string | null) => Promise<boolean>;
}

/**
 * Enqueue the current editor's content or title if they are dirty (unsaved changes).
 * This does NOT prompt the user or save online, just pushes to the sync queue.
 */
export function enqueueIfDirty({
  currentEditorKey,
  isContentSyncedRef,
  isDirtyRef,
  isTitleDirtyRef,
  enqueue,
}: {
  currentEditorKey: string | null;
  isContentSyncedRef: React.MutableRefObject<boolean>;
  isDirtyRef: React.MutableRefObject<boolean>;
  isTitleDirtyRef: React.MutableRefObject<boolean>;
  enqueue: (item: SyncQueueItem) => void;
}) {
  if (!currentEditorKey) return;
  let json = null;
  const raw = window.localStorage.getItem(`novel-content-${currentEditorKey}`);
  if (raw && raw !== "undefined" && raw !== "null") {
    json = JSON.parse(raw);
  }
  const isTitleDirty = isTitleDirtyRef.current;
  let pendingTitle: string | undefined;
  let pendingTitleParentId: string | null = null;
  let titleIcon: string | null = null;
  if (isTitleDirty) {
    const pendingTitleObj = localStorage.getItem(`pending-title-${currentEditorKey}`);
    if (pendingTitleObj) {
      try {
        const parsedObj = JSON.parse(pendingTitleObj);
        pendingTitle = parsedObj.newTitle;
        pendingTitleParentId = parsedObj.parentId;
        titleIcon = parsedObj.titleIcon;
      } catch (err) {
        console.error("Error in fetching new Title name", err);
      }
    }
  }
  if ((currentEditorKey && !isContentSyncedRef.current && isDirtyRef.current) || (currentEditorKey && pendingTitle)) {
    enqueue({
      noteId: currentEditorKey,
      content: isDirtyRef.current ? json : undefined,
      title: pendingTitle ? pendingTitle : undefined,
      icon: titleIcon,
      timestamp: Date.now(),
      parentId: pendingTitleParentId,
    });
  }
}

export function useUnsavedChangesCheck({
  isContentSyncedRef,
  isDirtyRef,
  isTitleDirtyRef,
  updateNote,
  enqueue,
  dequeue,
  setShowCreatingOverlay,
}: UseUnsavedChangesCheckProps): UseUnsavedChangesCheckResult {
  const { socketConnected } = useNoteContext();
  // Returns true if safe to proceed, false if user cancelled
  const checkAndHandleUnsavedChanges = useCallback(
    async (currentEditorKey: string | null): Promise<boolean> => {
      if (!currentEditorKey) return true;
      let json = null;
      const pageName = `docs/notes/${currentEditorKey}`;
      const raw = window.localStorage.getItem(`novel-content-${currentEditorKey}`);
      if (raw && raw !== "undefined" && raw !== "null") {
        json = JSON.parse(raw);
      }
      const hasContentToSave = !isContentSyncedRef.current && isDirtyRef.current && json;
      const isTitleDirty = isTitleDirtyRef.current;
      let pendingTitle: string | undefined;
      let pendingTitleParentId: string | null = null;
      let titleIcon: string | null = null;
      if (isTitleDirty) {
        const pendingTitleObj = localStorage.getItem(`pending-title-${currentEditorKey}`);
        if (pendingTitleObj) {
          try {
            const parsedObj = JSON.parse(pendingTitleObj);
            pendingTitle = parsedObj.newTitle;
            pendingTitleParentId = parsedObj.parentId;
            titleIcon = parsedObj.titleIcon;
          } catch (err) {
            console.error("Error in fetching new Title name", err);
          }
        }
      }
      // Enqueue if dirty
      if (
        (currentEditorKey && !isContentSyncedRef.current && isDirtyRef.current) ||
        (currentEditorKey && pendingTitle)
      ) {
        // Only enqueue if user confirmed and socket is connected
        if (socketConnected) {
          enqueue({
            noteId: currentEditorKey,
            content: isDirtyRef.current ? json : undefined,
            title: pendingTitle ? pendingTitle : undefined,
            icon: titleIcon,
            timestamp: Date.now(),
            parentId: pendingTitleParentId,
          });
        } else {
          console.warn("Socket not connected, skipping enqueue.");
        }
      }
      if (
        (currentEditorKey && !isContentSyncedRef.current && isDirtyRef.current) ||
        (currentEditorKey && pendingTitle)
      ) {
        const confirmSwitch = window.confirm(
          "You have unsaved changes. \n Do you want save content before proceeding?",
        );
        if (!confirmSwitch) {
          if (isDirtyRef.current) isDirtyRef.current = false;
          if (pendingTitle) isTitleDirtyRef.current = false;
          return true; // User chose not to save, but allow to proceed
        }
        setShowCreatingOverlay(true);
        let uploadSucceeded = true;
        // Save content
        if (hasContentToSave) {
          try {
            if (!socketConnected) {
              console.warn("Socket not connected, skipping uploadContent API call.");
              uploadSucceeded = false;
            } else {
              let json = null;
              const raw = window.localStorage.getItem(`novel-content-${currentEditorKey}`);
              if (raw && raw !== "undefined" && raw !== "null") {
                json = JSON.parse(raw);
              }
              const response = await postWithAuth(
                "/api/note/uploadContent",
                {
                  online_content: json,
                  online_content_time: new Date(),
                },
                {
                  headers: {
                    "x-vercel-pagename": pageName,
                  },
                },
              );
              if ("isError" in response && response.isError) {
                console.error("Error saving content online:", response.message);
                uploadSucceeded = false;
              } else {
                const uploadContentResponse = response as NoteResponse;
                const updatedAt = uploadContentResponse?.updatedAt;
                window.localStorage.setItem(`novel-content-${currentEditorKey}`, JSON.stringify(json));
                window.localStorage.setItem(`offline_content_time-${currentEditorKey}`, JSON.stringify(new Date()));
                window.localStorage.setItem(`last_content_update_time-${currentEditorKey}`, JSON.stringify(updatedAt));
                isDirtyRef.current = false;
              }
            }
          } catch (err) {
            console.error("Error in saving Online", err);
            uploadSucceeded = false;
          }
        }
        // Save title
        if (pendingTitle) {
          try {
            await updateNote(currentEditorKey, pendingTitle, pendingTitleParentId, titleIcon);
            isTitleDirtyRef.current = false;
            localStorage.removeItem(`pending-title-${currentEditorKey}`);
          } catch (err) {
            console.error("❌ Failed to update title:", err);
            uploadSucceeded = false;
          }
        }
        if (uploadSucceeded) {
          dequeue(currentEditorKey);
        }
        setShowCreatingOverlay(false);
        return true;
      }
      return true;
    },
    [
      isContentSyncedRef,
      isDirtyRef,
      isTitleDirtyRef,
      updateNote,
      enqueue,
      dequeue,
      setShowCreatingOverlay,
      socketConnected,
    ],
  );
  return { checkAndHandleUnsavedChanges };
}
