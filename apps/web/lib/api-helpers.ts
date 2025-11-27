/**
 * Helper functions for making authenticated API calls
 */
import { NEXTAUTH_API_URL } from "@/lib/config";
// Type definitions
type JsonResponse = Record<string, unknown>;

export type publishState = "Publish" | "pending" | "approved" | "rejected" | "accepted";

export interface publishResponse extends JsonResponse {
  approvalStatus?: publishState;
  isPublish?: boolean;
  updatedAt: string;
}

// Error response type
export interface ApiErrorResponse {
  status: number;
  message: string;
  error?: string;
  isError: true;
}

// Utility functions for API calls
// Note: Request deduplication is now handled by React Query
// Request deduplication cache for in-flight requests (This prevents duplicate API calls for the same URL)
const inFlightRequests = new Map<string, Promise<any>>();

// Utility function to clear cached 404 errors
export function clearCached404Error(noteId: string) {
  window.localStorage.removeItem(`404-error-${noteId}`);
  window.localStorage.removeItem(`last-api-check-${noteId}`);
}

// Function to make an authenticated fetch request
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // Get the auth token from cookies
  const sessionToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("next-auth.session-token=") || row.startsWith("__Secure-next-auth.session-token="))
    ?.split("=")[1];

  // Add auth headers
  const headers = new Headers(options.headers || {});

  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }

  // Add user info from localStorage if available
  const user = localStorage.getItem("auth_user");
  if (user) {
    try {
      const userData = JSON.parse(user);
      if (userData.email) {
        headers.set("x-user-email", userData.email);
        if (userData.name) headers.set("x-user-name", userData.name);
        if (userData.image) headers.set("x-user-image", userData.image);
      }
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
    }
  }

  // Make the fetch request with auth headers
  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

function getRedirectUrl() {
  return typeof window !== "undefined" ? window.location.href : "";
}

// Get function with auth
export async function getWithAuth<T = JsonResponse | publishResponse | unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T | ApiErrorResponse> {
  // Create a unique key for this request (URL + method)
  const requestKey = `GET:${url}`;
  
  // Check if there's already an in-flight request for this URL
  const existingRequest = inFlightRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest as Promise<T | ApiErrorResponse>;
  }
  
  // Create a new request promise
  const requestPromise = (async () => {
    try {
      const response = await fetchWithAuth(url, {
        ...options,
        method: "GET",
      });

    // Handle authentication errors
    if (response.status === 401) {
      // Skip redirect on public server
      const isPublicServer = process.env.NEXT_PUBLIC_IS_PUBLIC_SERVER === "true";
      if (!isPublicServer) {
        window.location.href = `${NEXTAUTH_API_URL || "http://localhost:3001"}?redirect=${encodeURIComponent(getRedirectUrl())}`;
        throw new Error("Unauthorized: Redirecting to login...");
      }
      // On public server, just return the error without redirecting
      console.log("401 error on public server - skipping redirect");
    }

    // Handle different error status codes
    if (!response.ok) {
      let errorMessage = "An error occurred";

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, use default message
        if (response.status === 403) errorMessage = "You don't have permission to access this resource";
        if (response.status === 404) errorMessage = "The resource you're looking for was not found";
        if (response.status === 500) errorMessage = "Internal server error occurred";
        if (response.status >= 500) errorMessage = "Server error occurred. Please try again later";
      }

      return {
        status: response.status,
        message: errorMessage,
        isError: true,
      } as ApiErrorResponse;
    }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error("Network or parsing error:", error);
      return {
        status: 0,
        message: "Network error. Please check your connection and try again.",
        error: error instanceof Error ? error.message : "Unknown error",
        isError: true,
      } as ApiErrorResponse;
    } finally {
      // Remove from cache when request completes (success or failure)
      inFlightRequests.delete(requestKey);
    }
  })();
  
  // Store the promise in cache
  inFlightRequests.set(requestKey, requestPromise);
  
  return requestPromise;
}

// Post function with auth
export async function postWithAuth<T = JsonResponse | publishResponse | any, D = Record<string, any>>(
  url: string,
  data: D,
  options: RequestInit = {},
): Promise<T | ApiErrorResponse> {
  const isBinary = data instanceof ArrayBuffer || data instanceof Blob;
  try {
    const response = await fetchWithAuth(url, {
      ...options,
      method: "POST",
      headers: {
        ...(isBinary ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
      body: isBinary ? data : JSON.stringify(data),
    });

    // Handle authentication errors
    if (response.status === 401) {
      // Skip redirect on public server
      const isPublicServer = process.env.NEXT_PUBLIC_IS_PUBLIC_SERVER === "true";
      if (!isPublicServer) {
        window.location.href = `${NEXTAUTH_API_URL || "http://localhost:3001"}?redirect=${encodeURIComponent(getRedirectUrl())}`;
        throw new Error("Unauthorized: Redirecting to login...");
      }
      // On public server, just return the error without redirecting
      console.log("401 error on public server - skipping redirect");
    }

    // Handle different error status codes
    if (!response.ok) {
      let errorMessage = "An error occurred";

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, use default message
        if (response.status === 403) errorMessage = "You don't have permission to perform this action";
        if (response.status === 404) errorMessage = "The resource you're trying to update was not found";
        if (response.status === 500) errorMessage = "Internal server error occurred";
        if (response.status >= 500) errorMessage = "Server error occurred. Please try again later";
      }

      return {
        status: response.status,
        message: errorMessage,
        isError: true,
      } as ApiErrorResponse;
    }

    // Some APIs return no content
    if (response.status === 204) {
      return { success: true } as unknown as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    console.error("Network or parsing error:", error);
    return {
      status: 0,
      message: "Network error. Please check your connection and try again.",
      error: error instanceof Error ? error.message : "Unknown error",
      isError: true,
    } as ApiErrorResponse;
  }
}

// Put function with auth
export async function putWithAuth<T = JsonResponse, D = Record<string, unknown>>(
  url: string,
  data: D,
  options: RequestInit = {},
): Promise<T | ApiErrorResponse> {
  try {
    const response = await fetchWithAuth(url, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: JSON.stringify(data),
    });

    // Handle authentication errors
    if (response.status === 401) {
      // Skip redirect on public server
      const isPublicServer = process.env.NEXT_PUBLIC_IS_PUBLIC_SERVER === "true";
      if (!isPublicServer) {
        window.location.href = `${NEXTAUTH_API_URL || "http://localhost:3001"}?redirect=${encodeURIComponent(getRedirectUrl())}`;
        throw new Error("Unauthorized: Redirecting to login...");
      }
      // On public server, just return the error without redirecting
      console.log("401 error on public server - skipping redirect");
    }

    // Handle different error status codes
    if (!response.ok) {
      let errorMessage = "An error occurred";

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, use default message
        if (response.status === 403) errorMessage = "You don't have permission to perform this action";
        if (response.status === 404) errorMessage = "The resource you're trying to update was not found";
        if (response.status === 500) errorMessage = "Internal server error occurred";
        if (response.status >= 500) errorMessage = "Server error occurred. Please try again later";
      }

      return {
        status: response.status,
        message: errorMessage,
        isError: true,
      } as ApiErrorResponse;
    }

    // Some APIs return no content
    if (response.status === 204) {
      return { success: true } as unknown as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    console.error("Network or parsing error:", error);
    return {
      status: 0,
      message: "Network error. Please check your connection and try again.",
      error: error instanceof Error ? error.message : "Unknown error",
      isError: true,
    } as ApiErrorResponse;
  }
}

// Delete function with auth
export async function deleteWithAuth<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T | ApiErrorResponse> {
  try {
    const response = await fetchWithAuth(url, {
      ...options,
      method: "DELETE",
    });

    // Handle authentication errors
    if (response.status === 401) {
      // Skip redirect on public server
      const isPublicServer = process.env.NEXT_PUBLIC_IS_PUBLIC_SERVER === "true";
      if (!isPublicServer) {
        window.location.href = `${NEXTAUTH_API_URL || "http://localhost:3001"}?redirect=${encodeURIComponent(getRedirectUrl())}`;
        throw new Error("Unauthorized: Redirecting to login...");
      }
      // On public server, just return the error without redirecting
      console.log("401 error on public server - skipping redirect");
    }

    // Handle different error status codes
    if (!response.ok) {
      let errorMessage = "An error occurred";

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, use default message
        if (response.status === 403) errorMessage = "You don't have permission to perform this action";
        if (response.status === 404) errorMessage = "The resource you're trying to delete was not found";
        if (response.status === 500) errorMessage = "Internal server error occurred";
        if (response.status >= 500) errorMessage = "Server error occurred. Please try again later";
      }

      return {
        status: response.status,
        message: errorMessage,
        isError: true,
      } as ApiErrorResponse;
    }

    // Some APIs return no content
    if (response.status === 204) {
      return { success: true } as unknown as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    console.error("Network or parsing error:", error);
    return {
      status: 0,
      message: "Network error. Please check your connection and try again.",
      error: error instanceof Error ? error.message : "Unknown error",
      isError: true,
    } as ApiErrorResponse;
  }
}
