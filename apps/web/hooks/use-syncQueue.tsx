import { useEffect, useRef } from "react";
import { postWithAuth } from "@/lib/api-helpers";
import { NoteResponse } from "@/types/advance-editor";
import useNoteActions from "@/hooks/use-updateNode";


export interface SyncQueueItem {
    noteId: string;
    content?: unknown; // For Tiptap content
    title?: string;
    icon: string| null;
    timestamp: number;
    parentId?: string | null
}

const STORAGE_KEY = "note-sync-queue";

function loadQueue(): SyncQueueItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveQueue(queue: SyncQueueItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

function updateTitleDeep(nodeList: any[], editorKey: string, newTitle: string, newIcon: string|null): any[] {
  return nodeList.map((node) => {
    if (node.id === editorKey || node._id === editorKey) {
      return { ...node, title: newTitle, icon: newIcon };
    }

    if (node.children && Array.isArray(node.children)) {
      return {
        ...node,
        children: updateTitleDeep(node.children, editorKey, newTitle, newIcon),
      };
    }

    return node;
  });
}



export function useSyncQueue() {
  const isProcessing = useRef(false);
  const queueRef = useRef<SyncQueueItem[]>(loadQueue());
  const { UpdateNote } = useNoteActions();


  const enqueue = (item: SyncQueueItem) => {
    queueRef.current.push(item);
    queueRef.current = mergeAndDeduplicate(queueRef.current);
    saveQueue(queueRef.current);
    if (!isProcessing.current) runQueue();
  };


  const dequeue = (noteId: string) => {
    // Remove all items matching the noteId
    queueRef.current = queueRef.current.filter(item => item.noteId !== noteId);
    saveQueue(queueRef.current);
  };


  const mergeAndDeduplicate = (queue: SyncQueueItem[]) => {
    const map = new Map<string, SyncQueueItem>();
    for (const item of queue) {
      const existing = map.get(item.noteId);
      if (!existing) {
        map.set(item.noteId, item);
      } else {
        map.set(item.noteId, {
            noteId: item.noteId,
            content: item.content || existing.content,
            title: item.title ?? existing.title,
            icon: item.icon ?? existing.icon,
            timestamp: Math.max(item.timestamp, existing.timestamp),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  };

  const runQueue = async () => {
    
    
    if (isProcessing.current || !navigator.onLine) return;

    isProcessing.current = true;

    while (queueRef.current.length > 0) {
      const current = queueRef.current[0];

      try {
        // ⏱️ Skip invalid entries
        if (!current?.noteId) {
          queueRef.current = queueRef.current.slice(1);
          continue;
        }
        // 🔁 Sync content
        const pageName = `docs/notes/${current.noteId}`;

        if (current.content) {

          const response = await postWithAuth("/api/note/uploadContent", {
              online_content: current.content ?? undefined,
              online_content_time: new Date(),
            },
            {
                headers: {
                "x-vercel-pagename": pageName,
              },
            },
         );
            const uploadContentResponse = response as NoteResponse;
            const updatedAt = uploadContentResponse?.updatedAt;
            
            window.localStorage.setItem(
              `novel-content-${current.noteId}`,
              JSON.stringify(current.content),
            );
            window.localStorage.setItem(
              `offline_content_time-${current.noteId}`,
              JSON.stringify(new Date()),
            );
            window.localStorage.setItem(
              `last_content_update_time-${current.noteId}`,
              JSON.stringify(updatedAt),
            );
        }

        if (current.title || current.icon) {
          try {
            await UpdateNote(current.noteId, current.title as string, current.parentId, current.icon);
            // isTitleDirtyRef.current = false;
            // localStorage.removeItem(`pending-title-${current.noteId}`);
            // delete pendingTitleMap.current[editorKey]; // ✅ Clear after successful update
          } catch (err) {
            // toast.error("Error in updating name", err);
            console.error("❌ Failed to update title:", err);
          }

           if (current.title) {
            // If you track a canonical local title store, update that too:
            const rootNodesRaw = localStorage.getItem("rootNodes");
            if (rootNodesRaw) {
              const rootNodes = JSON.parse(rootNodesRaw);
              // 🔁 You’ll need your `updateTitleDeep` util here:
              const updatedRootNodes = updateTitleDeep(rootNodes, current.noteId, current.title,  current.icon);
              localStorage.setItem("rootNodes", JSON.stringify(updatedRootNodes));
            }
            // Remove any leftover pending-title flag for this note:
            localStorage.removeItem(`pending-title-${current.noteId}`);
          }

          
        }

        // 🔁 Sync title/icon
        
        // ✅ Remove successfully synced item
        queueRef.current = queueRef.current.slice(1);
        saveQueue(queueRef.current);
      } catch (err) {
        console.error("Sync failed, will retry:", err);
        break; // stop on failure
      }
    }

    isProcessing.current = false;
  };

  useEffect(() => {
    const interval = setInterval(runQueue, 10000); // retry every 10s
    return () => clearInterval(interval);
  }, []);

  return { enqueue, runQueue, dequeue };
}
