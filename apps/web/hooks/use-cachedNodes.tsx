import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { noteKeys } from "./use-notes";

// Type for cached nodes
export interface CachedNode {
  id: string;
  title: string;
  parentId: string;
  icon?: string;
  coverUrl?: string | null;
  children: { _id: string; title: string; icon?: string; userId?: string; userEmail?: string }[];
  userId?: string;
  userEmail?: string;
  isPublicNote?: boolean;
}

// Interface for cached nodes by parent ID
export interface CachedNodes {
  [parentId: string]: CachedNode[];
}

interface Node {
  id: string;
  title: string;
  parentId: string | null;
  icon?: string;
  children?: { _id: string; title: string; icon?: string }[];
  isPublicNote?: boolean;
}

interface INoteWithContent {
  _id: string;
  title: string;
  icon?: string;
  parentId?: string;
  children?: { _id: string; title: string; icon?: string; userId?: string; userEmail?: string }[];
  userId?: string;
  userEmail?: string;
  isPublicNote?: boolean;
  isRestrictedPage?: boolean;
  error?: string;
}

export default function useCachedNodes(rootNodes: Node[]) {
  const [cachedChildNodes, setCachedChildNodes] = useState<CachedNodes>({});
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const getParentPublicStatus = useCallback(
    (parentId: string): boolean => {
      const rootNode = rootNodes.find((node) => node.id === parentId);
      if (rootNode) return rootNode.isPublicNote ?? false;

      for (const nodes of Object.values(cachedChildNodes)) {
        const parentNode = nodes.find((node) => node.id === parentId);
        if (parentNode) return parentNode.isPublicNote ?? false;
      }

      return false;
    },
    [rootNodes, cachedChildNodes],
  );

  // Pre-cache root nodes' children
  useEffect(() => {
    if (rootNodes && rootNodes.length > 0) {
      const newCache = { ...cachedChildNodes };
      let cacheUpdated = false;

      rootNodes.forEach((node) => {
        const parentStatus = node.isPublicNote ?? false;
        if (node.children && node.children.length > 0 && !newCache[node.id]) {
          // Filter out children without valid _id and map to CachedNode
          const children: CachedNode[] = node.children
            .filter((child) => child._id && child.title) // Only include children with valid _id and title
            .map((child) => ({
              id: child._id, // We know _id exists due to filter
              title: child.title,
              icon: child.icon || "",
              parentId: node.id,
              children: [],
              isPublicNote: parentStatus,
            }));

          if (children.length > 0) {
            newCache[node.id] = children;
            cacheUpdated = true;
          }
        }
      });

      if (cacheUpdated) {
        setCachedChildNodes(newCache);
      }
    }
  }, [rootNodes]);

  // Track in-progress fetches to avoid duplicate requests
  const fetchingNodesRef = useRef<Set<string>>(new Set());

  /**
   * Fetch and cache children for a parent node using React Query
   */
  const fetchAndCacheChildren = useCallback(
    async (parentId: string) => {
      // Skip if parentId is not valid
      if (parentId === "notes" || !parentId || parentId === "undefined") {
        console.warn(`Invalid parentId: ${parentId}. Skipping fetch.`);
        return;
      }

      // Skip if already in cache
      if (cachedChildNodes[parentId]) {
        return;
      }

      // Skip if already fetching
      if (fetchingNodesRef.current.has(parentId)) {
        console.log(`Already fetching children for ${parentId}, skipping duplicate request`);
        return;
      }

      // Mark as fetching
      fetchingNodesRef.current.add(parentId);

      try {
        // Use React Query to fetch data
        const queryKey = [...noteKeys.detail(parentId), "children"];

        // Try to get from cache first
        const cachedData = queryClient.getQueryData<INoteWithContent>(queryKey);

        if (cachedData) {
          // Use cached data
          processNodeData(cachedData, parentId);
        } else {
          // Fetch fresh data
          const result = await queryClient.fetchQuery({
            queryKey,
            queryFn: async () => {
              const response = await fetch(`/api/note/getNote/${parentId}`, {
                headers: {
                  "Content-Type": "application/json",
                },
              });

              if (!response.ok) {
                // For 404 or 403 errors, return null instead of throwing
                if (response.status === 404 || response.status === 403) {
                  console.warn(`Node ${parentId} not accessible (${response.status}), skipping`);
                  return null;
                }
                throw new Error(`Failed to fetch children for ${parentId}`);
              }

              return response.json();
            },
            staleTime: 30000, // 30 seconds
          });
          
          const data = result;

          // Handle null response (e.g., from 404/403 errors)
          if (data) {
            processNodeData(data, parentId);
          } else {
            console.warn(`No data returned for parent ${parentId}, skipping`);
          }
        }
      } catch (error) {
        setFetchErrors((prev) => ({
          ...prev,
          [parentId]: error instanceof Error ? error.message : "Failed to fetch children",
        }));
      } finally {
        // Remove from fetching set
        fetchingNodesRef.current.delete(parentId);
      }
    },
    [cachedChildNodes, queryClient],
  );

  /**
   * Process node data and update cache
   */
  const processNodeData = useCallback(
    (noteData: INoteWithContent, parentId: string) => {
      if (noteData.error) {
        setFetchErrors((prev) => ({
          ...prev,
          [parentId]: noteData.error || "Failed to fetch children",
        }));
        return;
      }

      const parentStatus = getParentPublicStatus(parentId);

      if (noteData.children && Array.isArray(noteData.children)) {
        const mappedChildren: CachedNode[] = noteData.children.map((child) => ({
          id: child._id,
          title: child.title,
          icon: child.icon || "",
          parentId,
          children: [],
          userId: child.userId,
          userEmail: child.userEmail,
          isPublicNote: parentStatus,
        }));

        // Use setTimeout to move state updates outside of render cycle
        setTimeout(() => {
          setCachedChildNodes((prev) => ({
            ...prev,
            [parentId]: mappedChildren,
          }));

          // Clear any previous error
          if (fetchErrors[parentId]) {
            setFetchErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors[parentId];
              return newErrors;
            });
          }
        }, 0);

        // Store node data in localStorage to track that we've fetched it
        window.localStorage.setItem(`node-data-${parentId}`, "true");
      }
    },
    [fetchErrors, getParentPublicStatus],
  );

  /**
   * Fetch parent node for a child
   */
  const fetchAndCacheChildrenForNode = useCallback(
    async (childId: string): Promise<string | null> => {
      // Skip if already fetching
      if (fetchingNodesRef.current.has(childId)) {
        console.log(`Already fetching node ${childId}, skipping duplicate request`);
        return null;
      }

      // Mark as fetching
      fetchingNodesRef.current.add(childId);

      try {
        // Use React Query to fetch data
        const queryKey = noteKeys.detail(childId);

        // Try to get from cache first
        const cachedData = queryClient.getQueryData<INoteWithContent>(queryKey);

        if (cachedData) {
          // Use cached data
          window.localStorage.setItem(`node-data-${childId}`, "true");
          const parentId = cachedData.parentId;

          if (parentId) {
            await fetchAndCacheChildren(parentId);
            return parentId;
          }

          return null;
        }

        // Fetch fresh data
        const result = await queryClient.fetchQuery({
          queryKey,
          queryFn: async () => {
            const response = await fetch(`/api/note/getNote/${childId}`, {
              headers: {
                "Content-Type": "application/json",
              },
            });

            if (!response.ok) {
              // For 404 or 403 errors, return null instead of throwing
              if (response.status === 404 || response.status === 403) {
                console.warn(`Node ${childId} not accessible (${response.status}), skipping`);
                return null;
              }
              throw new Error(`Failed to fetch node ${childId}`);
            }

            return response.json();
          },
          staleTime: 30000, // 30 seconds
        });
        
        const data = result;

        // Handle null response (e.g., from 404/403 errors)
        if (!data) {
          console.warn(`No data returned for node ${childId}, skipping`);
          return null;
        }

        window.localStorage.setItem(`node-data-${childId}`, "true");

        // Check if data exists and has parentId property
        if (data && typeof data === "object" && "parentId" in data) {
          const parentId = data.parentId;

          if (parentId) {
            await fetchAndCacheChildren(parentId);
            return parentId;
          }
        }

        return null;
      } catch (error) {
        console.error(`Error fetching parent for ${childId}:`, error);
        return null;
      } finally {
        // Remove from fetching set
        fetchingNodesRef.current.delete(childId);
      }
    },
    [fetchAndCacheChildren, queryClient],
  );

  /**
   * Add a new child to the cache
   */
  const addChildToCache = useCallback(
    (
      parentId: string,
      childId: string,
      childTitle: string,
      childIcon: string | null,
      userId?: string,
      userEmail?: string,
      isPublicNote?: boolean,
    ) => {
      const isPublic = getParentPublicStatus(parentId);
      setCachedChildNodes((prev) => {
        const newCache = { ...prev };
        // Ensure the array exists
        if (!newCache[parentId]) {
          newCache[parentId] = [];
        }

        // Check if child already exists to avoid duplicates
        const parentArray = newCache[parentId] || [];
        const existingChildIndex = parentArray.findIndex((child) => child.id === childId);
        if (existingChildIndex !== -1) {
          // Update existing child
          const existingNode = parentArray[existingChildIndex];
          if (existingNode) {
            parentArray[existingChildIndex] = {
              ...existingNode,
              id: childId, // Ensure id is set
              title: childTitle,
              icon: childIcon || "",
              userId,
              userEmail,
              isPublicNote: isPublic,
              parentId, // Ensure parentId is set
              children: existingNode.children || [],
            };
          }
        } else {
          // Add new child
          parentArray.push({
            id: childId,
            title: childTitle,
            parentId,
            icon: childIcon || "",
            children: [],
            userId,
            userEmail,
            isPublicNote: isPublic,
          });
        }
        return newCache;
      });

      // Also update in React Query cache
      queryClient.setQueryData([...noteKeys.detail(parentId), "children"], (oldData: unknown) => {
        if (!oldData || typeof oldData !== "object" || !("children" in oldData) || !Array.isArray(oldData.children)) {
          return oldData;
        }

        const typedData = oldData as { children: Array<{ _id: string; title: string; icon?: string }> };
        const children = [...typedData.children];
        const existingChildIndex = children.findIndex((child) => child._id === childId);

        if (existingChildIndex !== -1) {
          // Update existing child
          const existingChild = children[existingChildIndex];
          if (existingChild) {
            children[existingChildIndex] = {
              _id: existingChild._id,
              title: childTitle,
              icon: childIcon || "",
            };
          }
        } else {
          // Add new child
          children.push({
            _id: childId,
            title: childTitle,
            icon: childIcon || "",
          });
        }

        return {
          ...oldData,
          children,
        };
      });
    },
    [getParentPublicStatus, queryClient],
  );

  /**
   * Update a node in the cache
   */
  const updateNodeInCache = useCallback(
    (nodeId: string, newTitle: string, newIcon: string, newCoverUrl?: string | null) => {
      // Update in all parent's children arrays
      setCachedChildNodes((prev) => {
        const newCache = { ...prev };

        // Find all parents that contain this node as a child
        Object.keys(newCache).forEach((parentId) => {
          // Get the array safely
          const parentArray = newCache[parentId] || [];

          const nodeIndex = parentArray.findIndex((node) => node.id === nodeId);
          if (nodeIndex !== -1) {
            const existingNode = parentArray[nodeIndex];
            if (existingNode) {
              // Update the node
              parentArray[nodeIndex] = {
                ...existingNode,
                id: existingNode.id, // Ensure id is preserved
                title: newTitle,
                icon: newIcon,
                coverUrl: newCoverUrl !== undefined ? newCoverUrl : existingNode.coverUrl,
                parentId: existingNode.parentId, // Ensure parentId is preserved
                children: existingNode.children || [],
              };
            }
          }
        });

        return newCache;
      });

      // Update in React Query cache
      queryClient.setQueryData(noteKeys.detail(nodeId), (oldData: unknown) => {
        if (!oldData || typeof oldData !== "object") {
          return oldData;
        }

        return {
          ...(oldData as object),
          title: newTitle,
          icon: newIcon,
        };
      });
    },
    [queryClient],
  );

  /**
   * Remove a node from the cache
   */
  const removeNodeFromCache = useCallback(
    (nodeId: string) => {
      // Remove from all parent's children arrays
      setCachedChildNodes((prev) => {
        const newCache = { ...prev };

        // Find all parents that contain this node as a child
        Object.keys(newCache).forEach((parentId) => {
          const parentArray = newCache[parentId];
          if (parentArray) {
            newCache[parentId] = parentArray.filter((node) => node.id !== nodeId);
          }
        });

        // Also remove this node's children if it was a parent
        delete newCache[nodeId];

        return newCache;
      });

      // Remove from React Query cache
      queryClient.removeQueries({ queryKey: noteKeys.detail(nodeId) });
    },
    [queryClient],
  );

  return {
    cachedChildNodes,
    fetchErrors,
    setCachedChildNodes,
    fetchAndCacheChildren,
    addChildToCache,
    updateNodeInCache,
    removeNodeFromCache,
    fetchAndCacheChildrenForNode,
  };
}
