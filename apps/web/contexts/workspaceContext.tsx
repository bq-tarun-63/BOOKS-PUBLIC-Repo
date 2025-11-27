"use client"

import { useState , createContext, ReactNode, useContext, useEffect, useCallback} from "react"
import type { Workspace, Members, Notifications, WorkspaceGroup } from "@/types/workspace";
import { fetchWorkspaces } from "@/services-frontend/workspace/workspaceServices";
import { createGroup, updateGroup, deleteGroup } from "@/services-frontend/workspace/groupServices";
import CryptoJS from "crypto-js";
import { useNotificationsContext } from "./notification/notificationContext";
import { toast } from "sonner";

const SECRET_KEY = process.env.NEXT_PUBLIC_CJS_TOKEN ;

type workspaceContextType = {
    name: string
    workspaces: Workspace[];
    fetchAllWorkspace: () => Promise<void>;
    setCurrentWorkspace: (workspace: Workspace | null) => void;
    handleSelectedWorkspace: (workspace: Workspace) => void;
    workspaceMembers: Members[];
    workspaceNotifications: Notifications[];
    allWorkspaceMemberName: string[]
    currentWorkspace: Workspace | null
    workspaceGroups: WorkspaceGroup[];
    refreshWorkspaceGroups: () => void;
    createWorkspaceGroup: (name: string, members?: Members[]) => Promise<WorkspaceGroup | null>;
    updateWorkspaceGroup: (groupId: string, name?: string, members?: Members[]) => Promise<void>;
    deleteWorkspaceGroup: (groupId: string) => Promise<void>;
}

const WorkspaceContext = createContext<workspaceContextType | undefined>(undefined);

export function WorkspaceProvider({children} : {children : ReactNode}) {

    const [name, setName] = useState<string>('')
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [workspaceMembers , setWorkspaceMembers] = useState<Members[]>([]);
    const [workspaceNotifications, setWorkspaceNotifications] = useState<Notifications[]>([]);
    const [allWorkspaceMemberName , setAllWorkspaceMemberName] = useState<string[]>([])
    const [workspaceGroups, setWorkspaceGroups] = useState<WorkspaceGroup[]>([]);
    
    function getWorkspaceIdFromCookie(): string | null {
        const match = document.cookie.match(new RegExp("(^| )workspace=([^;]+)"));
        if (!match || !match[2]) return null;
      
        try {
          const decrypted = CryptoJS.AES.decrypt(decodeURIComponent(match[2]), SECRET_KEY);
          const parsed = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
          return parsed.workspaceId;
        } catch (err) {
          console.error("Failed to decrypt workspace cookie:", err);
          return null;
        }
    }

    const handleRealTimeNotification = async (workspaceId:string) => {
        if (!workspaceId) return;
      
        const eventSource =  new EventSource(
          `/api/workSpace/notification`
        );

        eventSource.onopen = () => {
            console.log("SSE connection opened");
        };
              
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            setWorkspaceNotifications((prev) => [
              data.notification,
              ...prev, // prepend so newest shows first
            ]);
          } catch (err) {
            console.error("Failed to parse SSE notification", err);
          }
        };

         eventSource.onerror = (err) => {
          console.error("SSE connection error:", err);
          eventSource.close();
        };

        return () => {
          console.log(" Closing SSE connection");
          eventSource.close();
        };
    }
      

    const handleSelectedWorkspace = (workspace: Workspace) => {
        try{  
        // const selectedWorkspace = workspaces.find((ws) => ws._id === workspaceId)
        if(workspace){
            setCurrentWorkspace(workspace);
            
            // ✅ set notifications from workspace data
            setWorkspaceNotifications(workspace.notifications || []);

            //fetch the notifications

            //real-time notification 
            // 2️⃣ Live notifications (future only)
            // setTimeout(() => {
                //handleRealTimeNotification(workspace._id);
            // }, 0); // async, doesn’t block UI
        }
        else{
            console.warn("Workspace not found !")
        }
        }
        catch(err){
        console.error("Error selecting workspace ", err);
        }
    }

    useEffect(() => {
        const init = async () => {
          try {
            const data = await fetchWorkspaces();
            setWorkspaces(data);
        
            // 🔄 restore from cookie
            const savedId = getWorkspaceIdFromCookie();
            if (savedId) {
              const found = data.find((ws) => ws._id === savedId);
              if (found) {
                handleSelectedWorkspace(found);
              } else {
                console.warn(`Workspace with ID ${savedId} not found in fetched workspaces. Available workspaces:`, data.map(ws => ws._id));
              }
            } else {
              console.log("No workspace ID found in cookie");
            }
          } catch (error) {
            console.error("Error initializing workspace context:", error);
          }
        };
      
        init();
      }, []);

    useEffect(() => {
        //fetch the current workspace member
        const members  = currentWorkspace?.members
        if(!members){
            setWorkspaceMembers([])
            return
        }else{
            setWorkspaceMembers(members);
            // Extract only userEmail
            const memberEmails = members.map((m) => m.userName);
            setAllWorkspaceMemberName(memberEmails);
        }
        
        // Fetch groups from workspace and normalize IDs
        const groups = (currentWorkspace.groups || []).map((group: any) => ({
            ...group,
            id: group.id || String(group._id),
        }));
        setWorkspaceGroups(groups);
    },[currentWorkspace])

    const refreshWorkspaceGroups = useCallback(() => {
        if (currentWorkspace) {
            const groups = ((currentWorkspace)?.groups || []).map((group: any) => ({
                ...group,
                id: group.id || String(group._id),
            }));
            setWorkspaceGroups(groups);
        }
    }, [currentWorkspace]);

    const createWorkspaceGroup = async (name: string, members: Members[] = []): Promise<WorkspaceGroup | null> => {
        if (!currentWorkspace?._id) {
            toast.error("No workspace selected");
            return null;
        }

        try {
            const response = await createGroup({
                workspaceId: currentWorkspace._id,
                name,
                members,
            });

            // Get the updated groups from the workspace response and normalize IDs
            const updatedGroups = (response.groups || []).map((group: any) => ({
                ...group,
                id: group.id || String(group._id),
            }));
            setWorkspaceGroups(updatedGroups);
            
            // Update workspace in state
            if (currentWorkspace) {
                setCurrentWorkspace({
                    ...currentWorkspace,
                    groups: updatedGroups,
                } as Workspace);
            }

            // Find and return the newly created group (last one in the array)
            const newGroup = updatedGroups[updatedGroups.length - 1];
            toast.success("Group created successfully");
            return newGroup || null;
        } catch (error) {
            console.error("Error creating group:", error);
            toast.error(error instanceof Error ? error.message : "Failed to create group");
            return null;
        }
    };

    const updateWorkspaceGroup = async (groupId: string, name?: string, members?: Members[]): Promise<void> => {
        if (!currentWorkspace?._id) {
            toast.error("No workspace selected");
            return;
        }

        try {
            const response = await updateGroup({
                workspaceId: currentWorkspace._id,
                groupId,
                name,
                members,
            });

            // Get the updated groups from the workspace response and normalize IDs
            const updatedGroups = (response.groups || []).map((group: any) => ({
                ...group,
                id: group.id || String(group._id),
            }));
            setWorkspaceGroups(updatedGroups);

            // Update workspace in state
            if (currentWorkspace) {
                setCurrentWorkspace({
                    ...currentWorkspace,
                    groups: updatedGroups,
                } as Workspace);
            }

            toast.success("Group updated successfully");
        } catch (error) {
            console.error("Error updating group:", error);
            toast.error(error instanceof Error ? error.message : "Failed to update group");
        }
    };

    const deleteWorkspaceGroup = async (groupId: string): Promise<void> => {
        if (!currentWorkspace?._id) {
            toast.error("No workspace selected");
            return;
        }

        try {
            const response = await deleteGroup({
                workspaceId: currentWorkspace._id,
                groupId,
            });

            // Get the updated groups from the workspace response and normalize IDs
            const updatedGroups = (response.groups || []).map((group: any) => ({
                ...group,
                id: group.id || String(group._id),
            }));
            setWorkspaceGroups(updatedGroups);

            // Update workspace in state
            if (currentWorkspace) {
                setCurrentWorkspace({
                    ...currentWorkspace,
                    groups: updatedGroups,
                } as Workspace);
            }

            toast.success("Group deleted successfully");
        } catch (error) {
            console.error("Error deleting group:", error);
            toast.error(error instanceof Error ? error.message : "Failed to delete group");
        }
    };

    //Real time Notification
    // useEffect(() => {
    //     console.log("1111111---->")
    //     console.log("🔔 SSE connection opened -------->", currentWorkspace?._id);
    //     if (!currentWorkspace?._id) return;
      
    //     const eventSource = new EventSource(
    //       `/api/workSpace/notification`
    //     );
      
    //     eventSource.onmessage = (event) => {
    //       try {
    //         const data = JSON.parse(event.data);
    //         console.log("🔔 New Notification SSE ->", data);
      
    //         setWorkspaceNotifications((prev) => [
    //           data.notification,
    //           ...prev, // prepend so newest shows first
    //         ]);
    //       } catch (err) {
    //         console.error("Failed to parse SSE notification", err);
    //       }
    //     };
      
    //     eventSource.onerror = (err) => {
    //       console.error("SSE connection error:", err);
    //       eventSource.close();
    //     };

    //     eventSource.onopen = () => {
    //         console.log("✅ SSE connection opened");
    //     };
          
    //     return () => {
    //       console.log("🔌 Closing SSE connection");
    //       eventSource.close();
    //     };
    // }, []); 


    const fetchAllWorkspace = async () => {
        const data = await fetchWorkspaces();
        setWorkspaces(data);
    };

    return <WorkspaceContext.Provider value={ {
        name, 
        workspaces, 
        fetchAllWorkspace,
        setCurrentWorkspace, 
        workspaceMembers,
        handleSelectedWorkspace,
        workspaceNotifications,
        allWorkspaceMemberName, 
        currentWorkspace,
        workspaceGroups,
        refreshWorkspaceGroups,
        createWorkspaceGroup,
        updateWorkspaceGroup,
        deleteWorkspaceGroup,
    }} >
        {children}
    </WorkspaceContext.Provider>
}

export function useWorkspaceContext(){
    const context = useContext(WorkspaceContext)
    if (context === undefined) {
        throw new Error("useWorkspaceContext must be used within a workspaceProvider");
    }
    return context; 
}
