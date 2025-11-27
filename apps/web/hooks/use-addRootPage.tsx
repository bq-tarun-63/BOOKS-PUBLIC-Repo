import { useAuth } from "@/hooks/use-auth";
// hooks/use-addRootPage.ts
import { getWithAuth, postWithAuth } from "@/lib/api-helpers";
import { defaultEditorContent } from "@/lib/content";
import { Members } from "@/types/workspace";
import { ObjectId } from "bson";
import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid"; // for temp optimistic ID
import { useNotifications } from "@/hooks/use-notifications";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { Comment } from "@/types/board";

export interface Node {
  id: string;
  noteId: string;
  title: string;
  parentId: string | null;
  gitPath: string;
  commitSha: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  icon?: string;
  children: { _id: string; title: string; icon?: string }[];
  isPublicNote: boolean;
  userEmail?: string;
  isPublish?: boolean;
  isRestrictedPage?: boolean;
  isTemplate?: boolean;
  workAreaId: string;
}

export interface Page extends Node {
  databaseViewId?: string;
  databaseProperties?: Record<string, string>;
  description?: string;
  assign?: Members[];
  noteType?: string;
  contentPath?: string;
  comments: Comment[];
 }


export interface CreateNoteResponse {
  id: string;
  noteId: string;
  title: string;
  parentId: string | null;
  contentPath: string;
  commitSha: string;
  children: Array<{ _id: string; title: string; icon: string }>;
  content: string;
  [key: string]: unknown;
  isPublicNote: boolean;
  noteType: string;
  icon: string;
  isPublish: boolean;
  workspaceMembers?:any;
  isTemplate?: boolean;
}

export default function useAddRootPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { notifyPublicPage } = useNotifications();
  const { workspaceMembers } = useWorkspaceContext()

  let newPageID = "";
  let newPageTitle = "";

  const addRootPage = async (
    title: string,
    parentId: string | null = null,
    isRestrictedPage: boolean,
    icon: string | null = null,
    isPublicNote: boolean,
    viewId?: string,
    databaseProperties?: Record<string, any>,
    databaseNoteId ?: string,        // this is the Id for the note on which the board view currently on , it is passed when we create a task/card Note   
    workAreaId : string | null = null,
  ): Promise<{ page:Page ,data: Node[] | null; newPageID: string; tempId: string; error: string | null }> => {
    // setIsLoading(true);
    setError(null);
    console.log("View ID in add root Page", viewId, title, parentId, isRestrictedPage, icon, isPublicNote)
    // Step 1: Optimistically create a new page
    const newObjId = new ObjectId();
    const tempId = `${newObjId}`; // temporary ID
    const optimisticNode: Page = {
      id: tempId,
      noteId: tempId,
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
      isRestrictedPage,
      isTemplate: false,
      databaseViewId: viewId,
      databaseProperties: databaseProperties || {},
      comments: [],
      workAreaId: workAreaId || "",
    };

    let updatedRootNodes: Node[] | null = null;
    // Store previous state for rollback
    let previousRootNodes: Node[] | null = null;
    let previousOptimisticIds: string[] = [];
    
    // Only push into sidebar rootNodes if no viewId
    if(!viewId){
      // Store previous state for rollback
      const localRootNodes = JSON.parse(localStorage.getItem("rootNodes") || "[]") as Node[];
      previousRootNodes = [...localRootNodes];
      previousOptimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");
      
      // Update localStorage immediately
      updatedRootNodes = [...localRootNodes, optimisticNode];

      localStorage.setItem("rootNodes", JSON.stringify(updatedRootNodes));
      localStorage.setItem(`novel-content-${tempId}`, JSON.stringify(defaultEditorContent));

      // Save in a list of optimistic note IDs
      const optimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");
      localStorage.setItem("optimistic-note-ids", JSON.stringify([...optimisticIds, tempId]));
    }

    // return { newPageID, addRootPage, isLoading, error };

    (async () => {
      try {
        // Use postWithAuth to include authentication headers
        const responseObject = await postWithAuth<CreateNoteResponse>("/api/note/createNote", {
          title,
          parentId,
          isRestrictedPage,
          icon,
          isPublicNote,
          noteId: tempId,
          databaseViewId: viewId,
          databaseProperties: databaseProperties || null,
          databaseNoteId:databaseNoteId,
          workAreaId: workAreaId || null,
        });

        // Check if the response is an error
        if ("isError" in responseObject && responseObject.isError) {
          const errorResponse = responseObject as { message: string; isError: true };
          console.error("Error creating note:", errorResponse.message);
          // Rollback optimistic updates
          if (!viewId && previousRootNodes) {
            try {
              localStorage.setItem("rootNodes", JSON.stringify(previousRootNodes));
              localStorage.setItem("optimistic-note-ids", JSON.stringify(previousOptimisticIds));
              localStorage.removeItem(`novel-content-${tempId}`);
            } catch (rollbackError) {
              console.error("Failed to rollback optimistic note creation:", rollbackError);
            }
          }
          toast.error(errorResponse.message || "Failed to create note");
          setError(errorResponse.message || "Failed to create note");
          return { data: null, newPageID: "", error: errorResponse.message || "Failed to create note" };
        }


        // Now TypeScript knows responseObject is CreateNoteResponse
        const successResponse = responseObject as CreateNoteResponse;
        newPageID = successResponse.id;
        newPageTitle = successResponse.title;
        const contentData = successResponse.content;
        console.log("Content Data -->", contentData)
        const parsedContent =   typeof contentData === "string" && contentData !== ""
                                                                                ? JSON.parse(contentData)
                                                                                : defaultEditorContent;

       if(!viewId){ 
          const localRootNodes = JSON.parse(localStorage.getItem("rootNodes") || "[]") as Node[];
          const updatedRootNodes = localRootNodes.map((node) =>
            node.id === tempId
              ? {
                  ...node,
                  id: successResponse.id,
                  noteId: successResponse.noteId || successResponse.id,
                  title: successResponse.title,
                  parentId: successResponse.parentId,
                  gitPath: successResponse.contentPath,
                  commitSha: successResponse.commitSha,
                  createdAt: successResponse.createdAt,
                  updatedAt: successResponse.updatedAt,
                  content: JSON.stringify(parsedContent),
                  icon: successResponse.icon || "",
                  children: successResponse.children || [],
                  isPublicNote: successResponse.isPublicNote,
                  isRestrictedPage: successResponse.isRestrictedPage,
                  userEmail: successResponse.userEmail, 
                  isTemplate: successResponse.isTemplate ?? false,
                  workAreaId: (successResponse as any).workAreaId || node.workAreaId || "",
                }
              : node,
          );

          window.localStorage.setItem(`novel-content-${tempId}`, JSON.stringify(parsedContent));
          window.localStorage.setItem("rootNodes", JSON.stringify(updatedRootNodes));
          // window.localStorage.setItem(`novel-content-${newPageID}` , JSON.stringify(contentData));

          const optimisticIds = JSON.parse(localStorage.getItem("optimistic-note-ids") || "[]");
          const filteredIds = optimisticIds.filter((id) => id !== tempId);
          
          localStorage.setItem("optimistic-note-ids", JSON.stringify(filteredIds));
          if(isPublicNote){
            notifyPublicPage(successResponse,workspaceMembers);
          }
        }

        return { data: updatedRootNodes as Node[], newPageID, error: null };
      } catch (err) {
        toast.error("Error in making page ", err);
        console.error("Error creating note:", err);

        // Rollback optimistic updates on error
        if (!viewId && previousRootNodes) {
          try {
            localStorage.setItem("rootNodes", JSON.stringify(previousRootNodes));
            localStorage.setItem("optimistic-note-ids", JSON.stringify(previousOptimisticIds));
            localStorage.removeItem(`novel-content-${tempId}`);
          } catch (rollbackError) {
            console.error("Failed to rollback optimistic note creation:", rollbackError);
          }
        }

        // Set the error message
        if (err instanceof Error) {
          setError(err.message || "Failed to create note");
        } else {
          setError("An unknown error occurred");
        }

        return { data: null, newPageID: "", error: err instanceof Error ? err.message : "An unknown error occurred" };
      } finally {
        setIsLoading(false);
      }
    })();

    // Return immediately with optimistic state
    return {
      page: optimisticNode,
      data: !viewId ? updatedRootNodes : null,
      newPageID: tempId,
      tempId,
      error: null,
    };
  };

  return { newPageID, addRootPage, isLoading, error };
}
