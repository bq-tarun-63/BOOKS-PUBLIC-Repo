"use client";

import { getWithAuth } from "@/lib/api-helpers";
import type { INoteWithContent } from "@/services/noteService";
import { useCallback } from "react";

export interface ChildNode {
  id: string;
  title: string;
  parentId: string | null;
  icon?: string;
  userId?: string;
  userEmail?: string;
  children?: ChildNode[];
  error?: {
    message: string;
    status: number;
    isAccessError?: boolean;
    noteTitle?: string;
  };
}

interface FetchChildResult extends Partial<INoteWithContent> {
  error?: {
    message: string;
    status: number;
    isAccessError?: boolean;
    noteTitle?: string;
  };
}

interface ApiErrorResponse extends Error {
  status: number;
  message: string;
  noteTitle?: string;
}

export default function useFetchChild() {
  return useCallback(async function fetchChildren(parentId: string): Promise<FetchChildResult> {
    try {
      const data = await getWithAuth<INoteWithContent>(`/api/note/getNote/${parentId}`);

      // Check if the response is an error
      if ("error" in data) {
        return {
          error: {
            message: data.error || data.message || "Failed to fetch note",
            status: data.status || 500,
            isAccessError: data.status === 403,
          },
        };
      }

      return data as INoteWithContent;
    } catch (error) {
      console.error("Error fetching note:", error);

      // Handle access errors and other issues
      if (error instanceof Error && "status" in error) {
        const responseError = error as ApiErrorResponse;

        if (responseError.status === 403) {
          // Access denied error
          return {
            error: {
              message: responseError.message || "You don't have access to this note",
              status: 403,
              isAccessError: true,
              noteTitle: responseError.noteTitle,
            },
          };
        }

        if (responseError.status === 404) {
          // Note not found
          return {
            error: {
              message: "Note not found",
              status: 404,
            },
          };
        }
      }

      // Generic error
      return {
        error: {
          message: "Failed to fetch note",
          status: 500,
        },
      };
    }
  }, []);
}
