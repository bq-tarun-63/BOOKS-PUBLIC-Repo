
import { useState, useEffect } from "react";
import { getWithAuth } from "@/lib/api-helpers";
import { ActivityLog } from "@/types/activityType";

interface ActivityLogResponse {
  success: boolean;
  activityLogs: ActivityLog[];
  message: string;
}

export function useActivityLogs(noteId: string | null) {
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [isLogLoading, setIsLogLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!noteId) {
            setActivityLogs([]);
            setError(null);
            return;
        }

        const fetchActivityLogs = async () => {
            setIsLogLoading(true);
            setError(null);
            
            try {
                const res = await getWithAuth(`/api/database/auditLog/get/${noteId}`) as ActivityLogResponse;
                console.log("Fetched activity logs:", res);
                
                if (res.success && res.activityLogs) {
                    setActivityLogs(res.activityLogs);
                } else {
                    setActivityLogs([]);
                    setError(res.message || "Failed to load activity logs");
                }
            } catch (err) {
                console.error("Error fetching activity logs:", err);
                setError("Failed to fetch activity logs");
                setActivityLogs([]);
            } finally {
                setIsLogLoading(false);
            }
        };

        fetchActivityLogs();
    }, [noteId]);
    
    return { 
        activityLogs,
        isLogLoading,
        error,
    };
}