import { type ApiErrorResponse, deleteWithAuth, getWithAuth, postWithAuth, putWithAuth } from "@/lib/api-helpers";
import { queryClient } from "@/lib/react-query";
import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseQueryResult,
  useMutation,
  useQuery,
} from "@tanstack/react-query";

// Type for API response
type ApiResponse<T> = T | ApiErrorResponse;

/**
 * Custom hook for GET requests
 * @param key - Query key for caching
 * @param url - API endpoint
 * @param options - Fetch options
 * @param queryOptions - React Query options
 */
export function useApiGet<T>(
  key: QueryKey,
  url: string,
  options?: RequestInit,
  queryOptions?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">,
): UseQueryResult<T, Error> {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: async () => {
      const response = await getWithAuth<T>(url, options);
      // Handle API errors by throwing during fetch, not in select
      if (response && typeof response === "object" && "isError" in response && response.isError) {
        throw new Error(response.message || "API Error");
      }
      return response as T;
    },
    ...queryOptions,
  });
}

/**
 * Custom hook for POST requests
 * @param url - API endpoint
 * @param options - Mutation options
 * @param invalidateQueries - Query keys to invalidate on success
 */
export function useApiPost<T, D>(
  url: string,
  options?: Omit<UseMutationOptions<ApiResponse<T>, Error, D>, "mutationFn">,
  invalidateQueries?: QueryKey[],
) {
  return useMutation<ApiResponse<T>, Error, D>({
    mutationFn: async (data: D) => postWithAuth<T, D>(url, data),
    ...options,
    onSuccess: (data, variables, context) => {
      // Check if response is an error
      if (data && typeof data === "object" && "isError" in data && data.isError) {
        throw new Error(data.message || "API Error");
      }

      // Invalidate relevant queries
      if (invalidateQueries) {
        invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Call the original onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
  });
}

/**
 * Custom hook for PUT requests
 * @param url - API endpoint
 * @param options - Mutation options
 * @param invalidateQueries - Query keys to invalidate on success
 */
export function useApiPut<T, D>(
  url: string,
  options?: Omit<UseMutationOptions<ApiResponse<T>, Error, D>, "mutationFn">,
  invalidateQueries?: QueryKey[],
) {
  return useMutation<ApiResponse<T>, Error, D>({
    mutationFn: async (data: D) => putWithAuth<T, D>(url, data),
    ...options,
    onSuccess: (data, variables, context) => {
      // Check if response is an error
      if (data && typeof data === "object" && "isError" in data && data.isError) {
        throw new Error(data.message || "API Error");
      }

      // Invalidate relevant queries
      if (invalidateQueries) {
        invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Call the original onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
  });
}

/**
 * Custom hook for DELETE requests
 * @param url - API endpoint
 * @param options - Mutation options
 * @param invalidateQueries - Query keys to invalidate on success
 */
export function useApiDelete<T>(
  url: string,
  options?: Omit<UseMutationOptions<ApiResponse<T>, Error, void>, "mutationFn">,
  invalidateQueries?: QueryKey[],
) {
  return useMutation<ApiResponse<T>, Error, void>({
    mutationFn: async () => deleteWithAuth<T>(url),
    ...options,
    onSuccess: (data, variables, context) => {
      // Check if response is an error
      if (data && typeof data === "object" && "isError" in data && data.isError) {
        throw new Error(data.message || "API Error");
      }

      // Invalidate relevant queries
      if (invalidateQueries) {
        invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Call the original onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
  });
}

/**
 * Prefetch data and add to cache
 * @param key - Query key for caching
 * @param url - API endpoint
 * @param options - Fetch options
 */
export async function prefetchApiData<T>(key: QueryKey, url: string, options?: RequestInit) {
  return queryClient.prefetchQuery({
    queryKey: key,
    queryFn: async () => getWithAuth<T>(url, options),
  });
}

/**
 * Manually invalidate queries
 * @param key - Query key to invalidate
 */
export function invalidateQueries(key: QueryKey) {
  return queryClient.invalidateQueries({ queryKey: key });
}

/**
 * Set query data manually
 * @param key - Query key to update
 * @param data - New data
 */
export function setQueryData<T>(key: QueryKey, data: T) {
  return queryClient.setQueryData(key, data);
}
