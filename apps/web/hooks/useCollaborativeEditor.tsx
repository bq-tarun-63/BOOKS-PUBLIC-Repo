// hooks/useCollaborativeEditor.ts
import { useEffect, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { ySyncPlugin, yCursorPlugin, yUndoPlugin } from "y-prosemirror";
import { Editor } from "@tiptap/core";


interface Props {
  editor: Editor | null;
  editorKey: string; // same as your current note ID
  mode: boolean;
  onSetLeader: (isLeader: boolean) => void; 
  isRestrictedPage : boolean
  noteType: string
}

export function useCollaborativeEditor({ editor, editorKey, mode,onSetLeader,isRestrictedPage, noteType}: Props) {
    const userString = window.localStorage.getItem("auth_user");
    const user = userString ? JSON.parse(userString) : null;
    const email = user?.email;
    const userName = user?.name;
    const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 100%, 70%)`;

    const leaderIdRef = useRef<number | null>(null);
    const [socketConnected, setSocketConnected] = useState<boolean>(true);
    const [initialSyncDone, setInitialSyncDone] = useState<boolean>(false);
    const syncedOnceRef = useRef(false);
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

    // Stable callbacks to avoid flushSync issues
    const handleStatus = useCallback((event: { status: string }) => {
      // Update socket connection status immediately - this is safe
      setSocketConnected(event.status === "connected");
    }, []);

    const handleSync = useCallback((isSynced: boolean) => {
      if (isSynced && !syncedOnceRef.current) {
        syncedOnceRef.current = true;
        // Defer state update to avoid flushSync warning
        setTimeout(() => {
          setInitialSyncDone(true);
        }, 0);
      }
    }, []);


  useEffect(() => {
    if (!editor || !editorKey) return;
    
    //check if the note is public or not , if not return 
    // if(!mode) return ;

    if(noteType !== "original") return ;

    const ydoc = new Y.Doc();
    // ✅ STEP 1: Apply offline backup if any
    const localBackup = localStorage.getItem(`novel-yjs-${editorKey}`);
    if (localBackup) {
      try {
        const update = JSON.parse(localBackup);
        if (update) {
          Y.applyUpdate(ydoc, new Uint8Array(update));
          console.log("✅ Applied offline backup to Y.Doc");
        }
      } catch (err) {
        console.error("Failed to apply local Yjs backup:", err);
      }
    }
    // ✅ STEP 2:Create a provider 
    const provider = new WebsocketProvider(process.env.SOCKET_SERVER_URL as string , editorKey, ydoc);
    const yXmlFragment = ydoc.getXmlFragment("prosemirror");

    // Listen for connection events
    provider.on("status", handleStatus);


    const localClientID = ydoc.clientID;

  
    provider.awareness.setLocalStateField("user", {
        name: userName || email, // Change to dynamic username if needed
        color: randomColor, // Unique color per user (can generate randomly or from user ID)
        isRestrictedPage: isRestrictedPage
    });

    // STEP 3 — Register plugins
    editor.registerPlugin(ySyncPlugin(yXmlFragment));
    editor.registerPlugin(yCursorPlugin(provider.awareness));
    editor.registerPlugin(yUndoPlugin());

    // Save local backup on every Y.Doc update
    const saveBackup = (update: Uint8Array) => {
      localStorage.setItem(`novel-yjs-${editorKey}`, JSON.stringify(Array.from(update)));
    };
  
    ydoc.on("update", saveBackup);

    // STEP 5 — Only overwrite local state after first sync
    provider.on("sync", handleSync);

    timeoutIdRef.current = setTimeout(() => {
      if (!syncedOnceRef.current) {
        console.warn("⚠️ Sync event missed, forcing initialSyncDone = true");
        syncedOnceRef.current = true;
        // Defer state update to avoid flushSync warning
        setTimeout(() => {
          setInitialSyncDone(true);
        }, 0);
      }
    }, 1500);
    
    // Leader detection
    const checkLeadership = () => {
      
      const states = provider.awareness.getStates();

      // Filter out restricted users
      const eligibleClientIds = Array.from(states.entries())
        .filter(([_, state]) => !state?.user?.isRestricted) // 👈 Only non-restricted users
        .map(([clientId]) => clientId);
    
      // If there are no eligible users, no leader
      if (eligibleClientIds.length === 0) {
        // Defer state update to avoid flushSync warning
        setTimeout(() => onSetLeader(false), 0);
        return;
      }      
      const newLeader = Math.min(...eligibleClientIds);
      // Defer state update to avoid flushSync warning
      setTimeout(() => onSetLeader(localClientID === newLeader), 0);
      leaderIdRef.current = newLeader;
      // const onlineUsers = Array.from(provider.awareness.getStates().entries())
      //               .map(([_, state]) => state?.user?.name)
      //               .filter(Boolean);

    };

    // Listen for awareness updates to re-check leader
    provider.awareness.on("update", checkLeadership);
    // Initial check
    checkLeadership();


    return () => {

      try {
        // Clear timeout
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }

        // Remove listeners
        provider.off("status", handleStatus);
        provider.off("sync", handleSync);
        provider.awareness.off("update", checkLeadership);
        ydoc.off("update", saveBackup);

        // Reset awareness
        provider.awareness.setLocalState(null);

        // Destroy connections
        provider.destroy();
        ydoc.destroy();

        // Reset state - defer to avoid flushSync warning
        setTimeout(() => {
          setSocketConnected(false);
          setInitialSyncDone(false);
        }, 0);
        syncedOnceRef.current = false;
      } catch (e) {
        console.error("Cleanup failed:", e);
      }
    };
  }, [editor, editorKey, onSetLeader, handleStatus, handleSync]);

  return { socketConnected,initialSyncDone };
}
