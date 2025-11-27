// commitUtils.ts
import { postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";

interface CommitCache {
  [key: string]: any;
}

function createCommitManager() {
  let cache: CommitCache = {};
  let originalContent: any = null;
  const maxCacheSize = 20;
  const LOCAL_STORAGE_KEY = "commitCache";

  // Load from localStorage when initializing
  function loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        cache = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load commit cache from localStorage", e);
    }
  }

  // Save to localStorage
  function saveToLocalStorage() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error("Failed to save commit cache", e);
    }
  }

  // Store original content before viewing history
  function storeOriginalContent(content: any) {
    originalContent = content;
    localStorage.setItem("originalContent", JSON.stringify(content));
  }

  // Get original content
  function getOriginalContent() {
    if (originalContent) return originalContent;
    try {
      const stored = localStorage.getItem("originalContent");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Clear original content
  function clearOriginalContent() {
    originalContent = null;
    localStorage.removeItem("originalContent");
  }

  // Check if content is cached
  function getCachedContent(noteId: string, commitSha: string) {
    const cacheKey = `${noteId}_${commitSha}`;
    return cache[cacheKey] || null;
  }

  // Cache commit content with size limit
  function setCachedContent(noteId: string, commitSha: string, content: any) {
    const cacheKey = `${noteId}_${commitSha}`;
    cache[cacheKey] = content;

    // Limit cache size
    const keys = Object.keys(cache);
    if (keys.length > maxCacheSize) {
      const oldestKey = keys[0];
      if (oldestKey !== undefined) {
        delete cache[oldestKey];
      }
    }

    saveToLocalStorage();
  }

  // Fetch commit history
  async function fetchCommitHistory(noteId: string) {
    try {
      const response = await postWithAuth("/api/commits", { noteId });

      if ("isError" in response && response.isError) {
        toast.error("Failed to load version history");
        return null;
      }

      return response.success ? response.commits : null;
    } catch (error) {
      toast.error("Failed to load version history");
      return null;
    }
  }

  // Load commit content (with caching + localStorage)
  async function loadCommitContent(noteId: string, commitSha: string, version: string) {
    console.log("=== COMMIT MANAGER DEBUG ===");
    console.log("Loading content for noteId:", noteId, "commitSha:", commitSha);
    
    // Check cache first
    const cached = getCachedContent(noteId, commitSha);
    if (cached) {
      console.log("Returning cached content:", cached);
      return cached;
    }

    try {
      console.log("Making API call for commit content");
      const response = await postWithAuth("/api/commitContent", {
        noteId,
        sha: commitSha,
        version
      });

      console.log("API response:", response);

      if (!response || response.isError) {
        console.log("API returned error or no response");
        return null;
      }

      const parsedContent =
      typeof response === "string" ? JSON.parse(response) : response;
      const onlineContent = parsedContent.online_content;

      console.log("Parsed content:", parsedContent);
      console.log("Online content:", onlineContent);

      if (onlineContent?.type === "doc") {
        setCachedContent(noteId, commitSha, onlineContent);
        console.log("Cached and returning content");
        return onlineContent;
      }
      console.log("Content type is not 'doc':", onlineContent?.type);
      return null;
    } catch (error) {
      console.error("Failed to load commit content:", error);
      return null;
    }
  }

  // Clear all cache for a specific note
  function clearNoteCache(noteId: string) {
    Object.keys(cache).forEach((key) => {
      if (key.startsWith(`${noteId}_`)) {
        delete cache[key];
      }
    });
    saveToLocalStorage();
  }

  // Clear entire cache
  function clearAllCache() {
    cache = {};
    saveToLocalStorage();
  }

  // initialize on load
  loadFromLocalStorage();

  return {
    storeOriginalContent,
    getOriginalContent,
    clearOriginalContent,
    getCachedContent,
    setCachedContent,
    fetchCommitHistory,
    loadCommitContent,
    clearNoteCache,
    clearAllCache,
  };
}

// Singleton instance
export const commitManager = createCommitManager();

// Named exports
export const {
  storeOriginalContent,
  getOriginalContent,
  clearOriginalContent,
  getCachedContent,
  setCachedContent,
  fetchCommitHistory,
  loadCommitContent,
  clearNoteCache,
  clearAllCache,
} = commitManager;
