import CryptoJS from "crypto-js";
import { useEffect, useState } from "react";

import type { WorkspaceResponse } from "@/types/workspace";

export interface RecentlyVisitedNote {
  id: string;
  title: string;
  icon?: string;
  updatedAt: number;
}

type RawRecentlyVisitedNote = {
  _id?: string;
  id?: string;
  title?: string;
  icon?: string;
  updatedAt?: string | number;
};

type FetchResult =
  | {
      success: true;
      notes: RecentlyVisitedNote[];
    }
  | {
      success: false;
      status: number;
      message: string;
    };

const WORKSPACE_COOKIE_NAME = "workspace";
const SECRET_KEY = process.env.NEXT_PUBLIC_CJS_TOKEN ?? "";

function toRecentlyVisitedNote(note: RawRecentlyVisitedNote): RecentlyVisitedNote {
  return {
    id: note._id ? String(note._id) : String(note.id ?? ""),
    title: note.title || "Untitled",
    icon: note.icon || "",
    updatedAt: note.updatedAt ? new Date(note.updatedAt).getTime() : Date.now(),
  };
}

function hasWorkspaceCookie() {
  if (typeof document === "undefined") {
    return false;
  }
  return document.cookie.split("; ").some((cookie) => cookie.startsWith(`${WORKSPACE_COOKIE_NAME}=`));
}

function setWorkspaceCookie(workspaceId: string, workspaceName: string | undefined) {
  if (typeof document === "undefined" || !workspaceId || !SECRET_KEY) {
    return;
  }
  try {
    const payload = CryptoJS.AES.encrypt(JSON.stringify({ workspaceId }), SECRET_KEY).toString();
    document.cookie = `${WORKSPACE_COOKIE_NAME}=${encodeURIComponent(payload)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
    if (workspaceName) {
      localStorage.setItem("selectedWorkspaceName", workspaceName);
    }
  } catch (error) {
    console.error("Failed to set workspace cookie:", error);
  }
}

async function fetchAvailableWorkspaces(): Promise<WorkspaceResponse["workspaces"]> {
  // Skip on public server
  const isPublicServer = process.env.NEXT_PUBLIC_IS_PUBLIC_SERVER === "true";
  if (isPublicServer) {
    return [];
  }
  
  try {
    const response = await fetch("/api/workSpace/getAll", {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as WorkspaceResponse | { workspaces?: unknown };
    if (Array.isArray((data as WorkspaceResponse).workspaces)) {
      return (data as WorkspaceResponse).workspaces;
    }
    if (Array.isArray((data as { workspaces?: unknown }).workspaces)) {
      return (data as { workspaces?: unknown }).workspaces as WorkspaceResponse["workspaces"];
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
    return [];
  }
}

async function ensureWorkspaceCookie(force = false): Promise<boolean> {
  if (typeof document === "undefined") {
    return false;
  }
  
  // Skip workspace cookie logic on public server
  const isPublicServer = process.env.NEXT_PUBLIC_IS_PUBLIC_SERVER === "true";
  if (isPublicServer) {
    return false;
  }
  
  if (!SECRET_KEY) {
    console.warn("Missing NEXT_PUBLIC_CJS_TOKEN; unable to set workspace cookie.");
    return false;
  }
  if (!force && hasWorkspaceCookie()) {
    return false;
  }

  const workspaces = await fetchAvailableWorkspaces();
  if (workspaces.length === 0) {
    return false;
  }

  const storedWorkspaceName = typeof window !== "undefined" ? localStorage.getItem("selectedWorkspaceName") : null;
  const preferredWorkspace = workspaces.find((workspace) => workspace.name === storedWorkspaceName) ?? workspaces[0];

  if (preferredWorkspace) {
    setWorkspaceCookie(preferredWorkspace._id, preferredWorkspace.name);
  }
  return true;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: unknown };
    if (data && typeof data.message === "string") {
      return data.message;
    }
  } catch {
    // no-op: fall back to default message
  }
  if (response.status === 401) {
    return "Please sign in to view your recent notes.";
  }
  if (response.status === 404) {
    return "Workspace not found.";
  }
  return "Failed to fetch recent notes";
}

async function requestRecentNotes(): Promise<FetchResult> {
  const response = await fetch("/api/getrecentNotes", {
    credentials: "include",
    cache: "no-store",
  });

  if (response.ok) {
    const data = await response.json();
    const notes: RecentlyVisitedNote[] = Array.isArray(data)
      ? data.map((note: RawRecentlyVisitedNote) => toRecentlyVisitedNote(note))
      : [];
    return { success: true, notes };
  }

  const message = await parseErrorMessage(response);
  return {
    success: false,
    status: response.status,
    message,
  };
}

async function fetchNotesWithWorkspaceRetry(): Promise<FetchResult> {
  await ensureWorkspaceCookie();

  let result = await requestRecentNotes();
  if (result.success) {
    return result;
  }

  if (result.status === 404) {
    const updatedWorkspace = await ensureWorkspaceCookie(true);
    if (updatedWorkspace) {
      result = await requestRecentNotes();
      if (result.success) {
        return result;
      }
    }
  }

  return result;
}

export function useRecentlyVisited() {
  const [recentNotes, setRecentNotes] = useState<RecentlyVisitedNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentNotes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/note/getrecentNotes');
        if (response.ok) {
          const data = await response.json();
          // Transform the data to match the expected format
          const transformedNotes: RecentlyVisitedNote[] = data.map((note: any) => ({
            id: note._id ? String(note._id) : note.id,
            title: note.title || 'Untitled',
            icon: note.icon || '',
            updatedAt: note.updatedAt ? new Date(note.updatedAt).getTime() : Date.now(),
          }));
          setRecentNotes(transformedNotes);
        } else {
          // Fallback to the workspace retry method
          const result = await fetchNotesWithWorkspaceRetry();
          if (result.success) {
            setRecentNotes(result.notes);
            return;
          }

          if (result.status === 404) {
            setRecentNotes([]);
            setError(result.message || null);
            return;
          }

          if (result.status === 401) {
            setRecentNotes([]);
            setError(result.message);
            return;
          }

          setError(result.message);
        }
      } catch (err) {
        console.error("Error fetching recent notes:", err);
        setError("Error loading recent notes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentNotes();
  }, []);

  const refreshRecentNotes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/note/getrecentNotes');
      if (response.ok) {
        const data = await response.json();
        const transformedNotes: RecentlyVisitedNote[] = data.map((note: any) => ({
          id: note._id ? String(note._id) : note.id,
          title: note.title || 'Untitled',
          icon: note.icon || '',
          updatedAt: note.updatedAt ? new Date(note.updatedAt).getTime() : Date.now(),
        }));
        setRecentNotes(transformedNotes);
      } else {
        // Fallback to the workspace retry method
        const result = await fetchNotesWithWorkspaceRetry();
        if (result.success) {
          setRecentNotes(result.notes);
          return;
        }

        if (result.status === 404) {
          setRecentNotes([]);
          setError(result.message || null);
          return;
        }

        if (result.status === 401) {
          setRecentNotes([]);
          setError(result.message);
          return;
        }

        setError(result.message);
      }
    } catch (err) {
      console.error("Error fetching recent notes:", err);
      setError("Error loading recent notes");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const date = new Date(timestamp);
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        return "Just now";
      }
      return `${hours}h ago`;
    }

    if (days < 7) {
      const weeks = Math.floor(days / 7);
      if (weeks === 0) {
        return `${days}d ago`;
      }
      return `${weeks}w ago`;
    }

    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  return {
    recentNotes,
    isLoading,
    error,
    refreshRecentNotes,
    formatTime,
  };
}
