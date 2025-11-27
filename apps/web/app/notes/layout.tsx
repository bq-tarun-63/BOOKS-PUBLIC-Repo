"use client";
import { Sidebar } from "@/components/tailwind/ui/Sidebar";
import Menu from "@/components/tailwind/ui/menu";
import { useNoteContext } from "@/contexts/NoteContext";
import { NotificationSocketListener } from "@/contexts/notification/notificationSocketListner";
import { CommentPanelProvider } from "@/contexts/inlineCommentContext";

import { ShareProvider, useShare } from "@/contexts/ShareContext";
import useAddRootPage from "@/hooks/use-addRootPage";
import { useAuth } from "@/hooks/use-auth";
import useCachedNodes from "@/hooks/use-cachedNodes";
import useFetchRootNodes from "@/hooks/use-fetchRootData";
import { useSyncQueue } from "@/hooks/use-syncQueue";
import { enqueueIfDirty, useUnsavedChangesCheck } from "@/hooks/use-unsaved-changes";
import { postWithAuth } from "@/lib/api-helpers";
import { defaultEditorContent } from "@/lib/content";
import { ObjectId } from "bson";
import { ChevronsRight, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type Node as CustomNode } from "@/types/note";


// Define a type for the createNote response
interface CreateNoteResponse {
  child: {
  id: string;
  title: string;
    icon?: string;
  [key: string]: unknown;
  };
  parent: {
    children: Array<{ _id: string; title: string; icon?: string }>;
    [key: string]: unknown;
  };
}

function NotesLayoutContent({ children }: { children: ReactNode }) {
  const [allRootNode, setAllRootNode] = useState<CustomNode[]>([]);
  const [selectedEditor, setSelectedEditor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCreatingOverlay, setShowCreatingOverlay] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { setShareNoteId } = useShare();
  // const { UpdateNote, DeleteNote } = useNoteActions();
  const { notes, setNotes, isContentSynced, isDirtyRef, previousNoteIdRef, isTitleDirtyRef, updateNote ,setSelectedWorkspace } =
    useNoteContext();
  const { user } = useAuth();
  const { enqueue, dequeue } = useSyncQueue();

  // Move isContentSyncedRef above its first use
  const isContentSyncedRef = useRef(isContentSynced);

  const unsavedChanges = useUnsavedChangesCheck({
    isContentSyncedRef,
    isDirtyRef,
    isTitleDirtyRef,
    updateNote,
    enqueue,
    dequeue,
    setShowCreatingOverlay,
  });

  useEffect(() => {
    const storedWorkspace = localStorage.getItem("selectedWorkspaceName");
    if (storedWorkspace) {
      setSelectedWorkspace(storedWorkspace);
    } else if(pathname !== "/organization/workspace") {
      // No workspace found, redirect to organization/workspace
      router.push("/organization/workspace");
    }
  }, [pathname,setSelectedWorkspace,router]);

  useEffect(() => {
    isContentSyncedRef.current = isContentSynced;
  }, [isContentSynced]);


  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current || isTitleDirtyRef.current) {
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Memoize the noteId extraction to prevent unnecessary recalculations
  const noteIdFromPath = useMemo(() => {
    if (!pathname) return null;
    const pathParts = pathname.split("/");
    const noteId = pathParts.pop();
    return noteId && noteId !== "notes" ? noteId : null;
  }, [pathname]);

   useEffect(() => {
    if (noteIdFromPath && isContentSyncedRef.current) {
      setSelectedEditor(noteIdFromPath);
    } else if (allRootNode.length > 0 && !noteIdFromPath && allRootNode[0]) {
      // Only redirect to first note if we're on the base /notes page
      setSelectedEditor(allRootNode[0].id);
    } else {
      setSelectedEditor(null);
    }
  }, [noteIdFromPath, allRootNode]);

  const { rootNodes, isLoading: isLoadingRootNodes } = useFetchRootNodes();
  const { addRootPage, isLoading: isCreating } = useAddRootPage();

  // Use the cached nodes hook
  const {
    cachedChildNodes,
    setCachedChildNodes,
    fetchAndCacheChildren,
    addChildToCache,
    updateNodeInCache,
    fetchAndCacheChildrenForNode,
  } = useCachedNodes(allRootNode);

  useEffect(() => {
    if (rootNodes.length > 0 && !isLoadingRootNodes) {
      const optimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");

      const existingIds = new Set(rootNodes.map((n) => n.id));
      const hasOptimistic = optimisticIds.some((id: string) => !existingIds.has(id));
  
      if (!hasOptimistic) {
        setAllRootNode(rootNodes);
        setNotes(rootNodes);
      }
      setIsLoading(false);
    }
  }, [rootNodes, isLoadingRootNodes, setNotes]);

  // Fix handleAddEditor parameter order and types
  const handleAddEditor = useCallback(
    async (
      title: string,
      parentId: string | null,
      isRestrictedPage: boolean,
      icon: string | null,
      isPublicNote: boolean,
      workAreaId: string | null = null,
    ) => {
      // Enqueue current editor's unsaved content/title if dirty
      enqueueIfDirty({
        currentEditorKey: noteIdFromPath,
        isContentSyncedRef,
        isDirtyRef,
        isTitleDirtyRef,
        enqueue,
      });

      try {
        if (parentId) {
          // Step 1: Optimistically create a new page
          const newObjId = new ObjectId();
          const tempId = `${newObjId}`; // temporary ID
          const optimisticNode: CustomNode = {
            id: tempId,
            title,
            parentId,
            gitPath: "",
            commitSha: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            content: "",
            icon: "",
            children: [],
            isPublicNote,
            userEmail: user?.email,
            isPublish: false,
            approvalStatus: "",
            isRestrictedPage: isRestrictedPage,
            noteType: "",
            workAreaId: workAreaId || "",
          };

          const localRootNodes = JSON.parse(localStorage.getItem("rootNodes") || "[]") as CustomNode[];
          // Insert the optimistic node

          // Update the parent's children list optimistically
          const updatedWithChild: CustomNode[] = localRootNodes.map((node) =>
            node.id === parentId
              ? {
                  ...node,
                  children: [...(node.children || []), { _id: tempId, title, icon: icon || "" }],
                }
              : node,
          );

          localStorage.setItem("rootNodes", JSON.stringify(updatedWithChild));
          localStorage.setItem(`novel-content-${tempId}`, JSON.stringify(defaultEditorContent));
          // Add the new child to the cache
          addChildToCache(parentId, tempId, title, icon || "", undefined, user?.email);

          const optimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");
          localStorage.setItem("optimistic-note-ids", JSON.stringify([...optimisticIds, tempId]));

          // Create a child note using authenticated request
          (async () => {
            try {
              const responseData = await postWithAuth("/api/note/createNote", {
                title,
                parentId,
                isRestrictedPage,
                icon,
                isPublicNote,
                noteId: tempId,
                workAreaId: workAreaId || null,
              });

              if ("error" in responseData) {
                console.error("Error creating child note:", responseData.error);
                return;
              }

              if (!responseData || !responseData.id) {
                console.error("Invalid createNote response:", responseData);
                return;
              }
              // If we have the parent and child data, update the cache

                // Add the new child to the cache
                addChildToCache(parentId, responseData.id, responseData.title, responseData.icon || "", undefined, user?.email);

                // Update allRootNode with the updated parent
                setAllRootNode((prevNodes: CustomNode[]) =>
                  prevNodes.map((node) =>
                    node.id === parentId ? { ...node, children: responseData.children } : node,
                  ),
                );

                setNotes((prevNotes: CustomNode[]) =>
                  prevNotes.map((node) =>
                    node.id === parentId ? { ...node, children: responseData.children } : node,
                  ),
                );       

                const optimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");
                localStorage.setItem("optimistic-note-ids", JSON.stringify(
                  optimisticIds.filter((id: string) => id !== tempId)
                ));
                // Navigate to the new note
                setSelectedEditor(responseData.id);
                router.push(`/notes/${responseData.id}`);
                isDirtyRef.current = false;
                isContentSyncedRef.current = false;
              
            } catch (err) {
              toast.error("Error in making page ", err);
              console.error("Error in creating Page", err);
            }
          })();

          if (updatedWithChild) {
            setNotes(updatedWithChild as CustomNode[]);
            setAllRootNode(updatedWithChild as CustomNode[]);
          }
        } else {
          // Create a root note
          const { data, newPageID, error } = await addRootPage(title, null, isRestrictedPage, icon, isPublicNote, undefined, undefined, undefined, workAreaId);
          window.localStorage.setItem("rootNodes", JSON.stringify(data));
          if (data) {
            setNotes(data as unknown as CustomNode[]);
            setAllRootNode(data as unknown as CustomNode[]);

            const newNoteId = newPageID;
            if (newNoteId) {
              router.push(`/notes/${newNoteId}`);
              setSelectedEditor(newNoteId);
              isDirtyRef.current = false;
              isContentSyncedRef.current = false;
            }
          } else {
            console.error("Failed to create root note", error);
          }
        }
      } catch (err) {
        console.error("Error creating note:", err);
      } finally {
        setShowCreatingOverlay(false);
      }
    },
    [
      addRootPage,
      router,
      addChildToCache,
      user,
      noteIdFromPath,
      enqueue,
      isContentSyncedRef,
      isDirtyRef,
      isTitleDirtyRef,
    ],
  );

  const handleShare = useCallback(
    (noteId: string) => {
      setShareNoteId(noteId);
    },
    [setShareNoteId],
  );

  const handleSelectEditor = useCallback(
    async (id: string) => {
      const currentEditorKey = noteIdFromPath;
      previousNoteIdRef.current = currentEditorKey;
      const canProceed = await unsavedChanges.checkAndHandleUnsavedChanges(currentEditorKey);
      if (canProceed) {
        setSelectedEditor(id);
        router.push(`/notes/${id}`);
      }
    },
    [noteIdFromPath, previousNoteIdRef, unsavedChanges, setSelectedEditor, router],
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <Sidebar
        key={allRootNode.map((n) => n.id).join("-")} // force re-render on rootNode change
        fallbackNotes={allRootNode}
        onAddEditor={handleAddEditor}
        onSelectEditor={handleSelectEditor}
        selectedEditor={selectedEditor}
        cachedChildNodes={cachedChildNodes}
        setCachedChildNodes={setCachedChildNodes}
        fetchAndCacheChildren={fetchAndCacheChildren}
        fetchAndCacheChildrenForNode={fetchAndCacheChildrenForNode}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpen={() => setIsSidebarOpen(true)}
        onShare={handleShare}
      />

      {/* Fixed Header */}
      <div className={`fixed top-0 left-0 right-0 z-40 px-4 py-4 flex justify-between items-center gap-2 sm:gap-1 bg-background dark:bg-background ${isSidebarOpen ? "lg:left-[15rem]" : ""}`}>
        {/* Mobile Toggle */}
        {!isSidebarOpen && (
          <button
            type="button"
            className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg"
            onClick={() => setIsSidebarOpen(true)}
          >
            <ChevronsRight className="w-5 h-5 text-gray-800 dark:text-gray-200" />
          </button>
        )}
        {isSidebarOpen && <div></div>}
        <Menu />
      </div>

      {/* Main Content */}
      <main
        className={`relative flex flex-col flex-1 items-center gap-4 py-4 pt-16 sm:px-5 overflow-x-hidden ${isSidebarOpen ? "lg:ml-[15rem]" : ""}`}
      >
        <CommentPanelProvider noteId={noteIdFromPath || undefined}>
          {children}
        </CommentPanelProvider>
      </main>

      {/* Loader overlay for deletion */}
      {showCreatingOverlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="flex items-center gap-2 text-white text-lg">
            <Loader2 className="w-6 h-6 animate-spin" />
            Saving page...
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotesLayout({ children }: { children: ReactNode }) {
  return <ShareProvider>
            <NotificationSocketListener />
            <NotesLayoutContent>{children}</NotesLayoutContent>
          </ShareProvider>
}
