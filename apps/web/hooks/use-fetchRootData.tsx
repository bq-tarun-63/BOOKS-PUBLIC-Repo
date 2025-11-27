"use client";
import { useNoteContext } from "@/contexts/NoteContext";
import { useWorkAreaContext } from "@/contexts/workAreaContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { type ApiErrorResponse, getWithAuth } from "@/lib/api-helpers";
import { useEffect, useRef, useState } from "react";

import type { Node } from "@/types/note";

interface UseFetchRootNodesResult {
  rootNodes: Node[];
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  refetch: () => void;
}

const CACHE_DURATION = 2 * 1000; // 2 seconds cache

const useFetchRootNodes = (): UseFetchRootNodesResult => {
  const [rootNodes, setRootNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const isFetchingRef = useRef(false);
  const {setNotes} = useNoteContext();
  const { refreshWorkAreas } = useWorkAreaContext();
  const { currentWorkspace } = useWorkspaceContext();

  const fetchData = async () => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      return;
    }

    // Check cache first
    const cachedData = localStorage.getItem("rootNodes");
    const lastFetch = localStorage.getItem("rootNodes_lastFetch");
    const cachedOrder = localStorage.getItem("rootOrder");

    if (cachedData && lastFetch) {
      const timeSinceLastFetch = Date.now() - Number.parseInt(lastFetch);
      if (timeSinceLastFetch < CACHE_DURATION) {
        try {
          let parsed = JSON.parse(cachedData);
          if (cachedOrder) {
            try {
              const { ids } = JSON.parse(cachedOrder) as { ids: string[] };
              const map = new Map(parsed.map((n: Node) => [n.id, n]));
              const ordered = ids.map((id) => map.get(id)).filter(Boolean) as Node[];
              const rest = parsed.filter((n: Node) => !ids.includes(n.id));
              parsed = [...ordered, ...rest];
            } catch (e) {
              // ignore corrupted order cache
            }
          }
          setRootNodes(parsed);
          setIsLoading(false);
          return;
        } catch (e) {
          // Cache is corrupted, proceed with fetch
        }
      }
    }

    setIsLoading(true);
    setError(null);
    isFetchingRef.current = true;

    try {
      const data = await getWithAuth<Node[]>("/api/note/getNoteParent");
      
      // Check if the response is an error
      if ("isError" in data && data.isError) {
        const errorResponse = data as ApiErrorResponse;
        if (errorResponse.status === 401) {
          setIsAuthenticated(false);
          setError("You need to log in to view your notes");
        } else if (errorResponse.status === 403) {
          setError("You don't have permission to view notes");
        } else {
          setError(errorResponse.message || "Failed to load your notes. Please try again.");
        }
      } else {
        // Success response
        let nodes = data as Node[];
        if (cachedOrder) {
          try {
            const { ids } = JSON.parse(cachedOrder) as { ids: string[] };
            const map = new Map(nodes.map((n: Node) => [n.id, n]));
            const ordered = ids.map((id) => map.get(id)).filter(Boolean) as Node[];
            const rest = nodes.filter((n: Node) => !ids.includes(n.id));
            nodes = [...ordered, ...rest];
          } catch (e) {
            // ignore corrupted order cache
          }
        }
        setRootNodes(nodes);
        setNotes(nodes);
        setIsAuthenticated(true);

        // Cache the data
        localStorage.setItem("rootNodes", JSON.stringify(nodes));
        localStorage.setItem("rootNodes_lastFetch", Date.now().toString());

        // Fetch work areas for the current workspace when notes are fetched
        console.log("currentWorkspace?._id -------->", currentWorkspace?._id);
        if (currentWorkspace?._id) {
          console.log("fetching work areas -------->");
          refreshWorkAreas().catch((err) => {
            console.error("Failed to fetch work areas:", err);
            // Don't show error to user, just log it
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    rootNodes,
    isLoading,
    error,
    isAuthenticated,
    refetch: fetchData,
  };
};

export default useFetchRootNodes;
