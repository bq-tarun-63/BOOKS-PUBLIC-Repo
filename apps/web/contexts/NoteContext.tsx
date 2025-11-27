"use client";
import { type ReactNode, createContext, useContext, useState, useRef, useEffect} from "react";
import { useRouter } from "next/navigation";
import type { Node } from "@/types/note";
import useNoteActions from "@/hooks/use-updateNode";
import useCachedNodes from "@/hooks/use-cachedNodes";
import type { CachedNodes } from "@/hooks/use-cachedNodes";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { noteKeys } from "@/hooks/use-notes";
interface SharedUser {
  email: string;
  access: string; 
}

interface NoteContextType {
  notes: Node[];
  setNotes: React.Dispatch<React.SetStateAction<Node[]>>;
  updateNote: (id: string, title: string, parentId: string | null, icon: string | null) => Promise<Node[] | null>;
  deleteNote: (id: string) => Promise<Node[] | null>;
  moveNote: (id:string, isPublicNote: boolean, isRestrictedPage: boolean) => Promise<Node[] | null>;
  activeTitle: string;
  setActiveTitle: React.Dispatch<React.SetStateAction<string>>;
  activeEmoji: string;
  setActiveEmoji: React.Dispatch<React.SetStateAction<string>>;
  selectedNoteId: string | null;
  setSelectedNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  isContentSynced: boolean;
  setIsContentSynced: React.Dispatch<React.SetStateAction<boolean>>;
  isDirtyRef: React.MutableRefObject<boolean>; 
  updatedNoteId: string | null;
  setUpdatedNoteId: React.Dispatch<React.SetStateAction<string | null>>
  cachedChildNodes: CachedNodes;
  setCachedChildNodes: React.Dispatch<React.SetStateAction<CachedNodes>>;
  updateNodeInCache: (id: string, title: string, icon: string, coverUrl?: string | null) => void;
  isTitleDirtyRef: React.MutableRefObject<boolean>
  previousNoteIdRef: React.MutableRefObject<string | null>
  socketConnected: boolean
  setSocketConnected: React.Dispatch<React.SetStateAction<boolean>>;
  editorTitle: string
  setEditorTitle: React.Dispatch<React.SetStateAction<string>>
  isPremiumUser: boolean;
  childrenNotes: CachedNodes;
  setChildrenNotes: React.Dispatch<React.SetStateAction<CachedNodes>>;
  selectedworkspace: string | null;
  setSelectedWorkspace: (name: string | null) => void;
  documentTitle: string
  setDocumentTitle: React.Dispatch<React.SetStateAction<string>>
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sharedWith: SharedUser[];
  setSharedWith: React.Dispatch<React.SetStateAction<SharedUser[]>>;
  iscurrentNotPublic: boolean;   
  setIsCurrentNoitePublic: React.Dispatch<React.SetStateAction<boolean>>; 

}

const NoteContext = createContext<NoteContextType | undefined>(undefined);

export function NoteProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Node[]>([]);
  const { UpdateNote, DeleteNote, MoveNote } = useNoteActions();
  const [activeTitle, setActiveTitle] = useState("");
  const [activeEmoji, setActiveEmoji] = useState("");
  const [editorTitle , setEditorTitle ] = useState("Untitled");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const router = useRouter();
  const { cachedChildNodes, setCachedChildNodes, updateNodeInCache } = useCachedNodes(notes);
  const [childrenNotes, setChildrenNotes] = useState<CachedNodes>({});
  const [isContentSynced, setIsContentSynced] = useState(true);
  const isDirtyRef = useRef(false); // true = has unsaved changes
  const [updatedNoteId, setUpdatedNoteId] = useState<string | null>(null);
  const isTitleDirtyRef = useRef(false); // true = title updated
  const previousNoteIdRef = useRef<string | null>(null);
  const [socketConnected , setSocketConnected] = useState<boolean>(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const premiumUsers = process.env.NEXT_PUBLIC_PREMIUM_USERS?.split(",") || [];
  const isPremiumUser = user ? premiumUsers.includes(user.email) : false;
  const [selectedworkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [documentTitle , setDocumentTitle ] = useState("Books By Betaque");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sharedWith, setSharedWith] = useState<SharedUser[]>([]);
  const [iscurrentNotPublic, setIsCurrentNoitePublic] = useState(false);

  useEffect(()=>{
     // Match URLs like /notes/noteId
     try {
      const match = pathname?.match(/^\/notes\/([^\/\?]+)/);
      if (match && match[1]) {
        const noteId = match[1];
        setSelectedNoteId(noteId);
        previousNoteIdRef.current = noteId;
      } else {
        setSelectedNoteId(null);
        previousNoteIdRef.current = null;
      }
    } catch (error) {
      console.error("Error parsing note ID from pathname:", error);
      setSelectedNoteId(null);
      previousNoteIdRef.current = null;
    }
  },[pathname])



  const queryClient = useQueryClient();

  const updateNote = async (id: string, title: string, parentId: string | null, icon: string | null) => {
    const updated = await UpdateNote(id, title, parentId, icon);

    if (updated) {
      setNotes(updated);
      
      window.localStorage.setItem("rootNodes", JSON.stringify(updated));
      updateNodeInCache(id, title, icon || "", null);
      
      // Invalidate React Query cache for the updated note
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
      
      // Find the actual parent ID from cached nodes if not provided
      let actualParentId = parentId;
      if (!actualParentId) {
        // Look through cached child nodes to find the parent
        for (const [pId, children] of Object.entries(cachedChildNodes)) {
          if (children.some(child => child.id === id)) {
            actualParentId = pId;
            break;
          }
        }
      }
      
      // If this is a child note, also invalidate the parent's children cache
      if (actualParentId) {
        queryClient.invalidateQueries({ queryKey: [...noteKeys.detail(actualParentId), "children"] });
      }
      
      const updatedNote = updated?.find((n) => n.id === id);
      const updatedTitle = updatedNote?.title as string;
      const updatedIcon = updatedNote?.icon as string;
     
      setActiveEmoji(updatedIcon);
      setActiveTitle(updatedTitle);
      setUpdatedNoteId(id)


      return updated;
    }

    return null;
  };

  const removeNodeFromCache = (id: string) => {
    try {
      // Remove cached content for editorKey = id
      localStorage.removeItem(`html-content-${id}`);
      localStorage.removeItem(`novel-content-${id}`);
      localStorage.removeItem(`markdown-${id}`);
      localStorage.removeItem(`offline_content_time-${id}`);
      localStorage.removeItem(`last_content_update_time-${id}`);
    } catch (error) {
      console.error("Failed to remove node from cache:", error);
    }
  };

  const deleteNote = async (id: string) => {
    const updated = await DeleteNote(id);
    if (updated){
      window.localStorage.setItem("rootNodes", JSON.stringify(updated));
      removeNodeFromCache(id);
      setNotes(updated);
      //Relaod the page 
      router.push('/')
      return updated;
    } 
    return null;
  };

  const moveNote = async (id : string , isPublicNote : boolean , isRestrictedPage : boolean)=>{

    if(!id) return null;
    const updated = await MoveNote(id, !isPublicNote, isRestrictedPage);

    if (updated){
      window.localStorage.setItem("rootNodes", JSON.stringify(updated));
      setNotes(updated);  
      router.push(`/notes/${id}`)      
      return updated;
    } 
    return null;
  }

  return (
    <NoteContext.Provider
      value={{
        notes,
        setNotes,
        updateNote,
        deleteNote,
        activeTitle,
        setActiveTitle,
        editorTitle,
        setEditorTitle,
        activeEmoji,
        setActiveEmoji,
        selectedNoteId,
        setSelectedNoteId,
        isContentSynced,
        setIsContentSynced,
        isDirtyRef, 
        moveNote,
        updatedNoteId,
        setUpdatedNoteId,
        cachedChildNodes,
        setCachedChildNodes,
        updateNodeInCache,
        isTitleDirtyRef,
        previousNoteIdRef,
        socketConnected,
        setSocketConnected,
        isPremiumUser,
        childrenNotes,
        setChildrenNotes,
        selectedworkspace,
        setSelectedWorkspace,
        documentTitle,
        setDocumentTitle,
        sidebarOpen,
        setSidebarOpen,
        sharedWith,
        setSharedWith,
        iscurrentNotPublic,        
        setIsCurrentNoitePublic,
      }}
    >
      {children}
    </NoteContext.Provider>
  );
}

export function useNoteContext() {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error("useNoteContext must be used within a NoteProvider");
  }
  return context;
}
