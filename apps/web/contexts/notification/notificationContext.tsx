// context/NotificationContext.tsx
"use client";

import { postWithAuth } from "@/lib/api-helpers";
import { Notification } from "@/types/notification";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceContext } from "@/contexts/workspaceContext";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>; 
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();  

  useEffect(() => {
    console.log("Notifications updated --_>", notifications)
  }, [notifications]);

  const fetchNotifications = async () => {
    try{
        const response = await postWithAuth('/api/notification/getAll',{
        }) 
        console.log("Notification -> ",response);
        const notifications = Array.isArray(response.notifications) ? response.notifications : []
        
        setNotifications(notifications);
    }
    catch(error){
        console.log(error)
    }
  };


  const unreadCount  = notifications.filter(n =>
    n.sentTo.some(st => st.userEmail === user?.email)
  ).length;

  useEffect(() => {
    if (user?.email && currentWorkspace?._id) {
        fetchNotifications();   // ✅ refetch when user enters workspace
    }
  }, [user?.email , currentWorkspace?._id]);

  return (
    <NotificationContext.Provider value={{ notifications,setNotifications, unreadCount, fetchNotifications}}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationsContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
