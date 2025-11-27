import { QueryClient } from "@tanstack/react-query";

// Create a client with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000, // Data considered fresh for 5 seconds
      gcTime: 5 * 60 * 1000, // Cache kept for 5 minutes
      retry: 1, // Only retry failed queries once
      refetchOnWindowFocus: false, // Don't refetch on window focus by default
    },
  },
});
