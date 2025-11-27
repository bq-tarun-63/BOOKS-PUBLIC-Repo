"use client";

import useFetchRootNodes from "@/hooks/use-fetchRootData";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NotesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
  const router = useRouter();
  const { rootNodes, isLoading: isLoadingRootNodes } = useFetchRootNodes();
  const { user } = useAuth();

  // Extract first name from user's name
  const firstName = user?.name?.split(' ')[0] || 'there';

  useEffect(() => {
    // Only attempt to redirect if we've loaded the root nodes and haven't redirected yet
    if (!isLoadingRootNodes && !hasRedirected) {
      if (rootNodes.length > 0 && rootNodes[0]) {
        // Redirect to the first note if available
        router.push(`/notes/${rootNodes[0].id}`);
        setHasRedirected(true);
      } else {
        setIsLoading(false);
      }
    } else if (!isLoadingRootNodes) {
      // If we're done loading but there are no notes to redirect to
      setIsLoading(false);
    }
  }, [rootNodes, router, isLoadingRootNodes, hasRedirected]);

  // If still loading or if we've initiated a redirect, show loading state
  if (isLoading || isLoadingRootNodes || hasRedirected) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4 w-full">
        <div className="flex items-center gap-2">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Loading notes...</span>
        </div>
      </div>
    );
  }

  // No notes found state - modern interactive welcome page
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4 w-full">
      <div className="max-w-2xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Welcome, {firstName}! 👋
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
            Create your first page in this workspace and start building something amazing.
          </p>
        </div>

        {/* Interactive Arrow Button */}
        <div className="group relative">
          <button
            type="button"
            onClick={() => {
              const addButton = document.querySelector(".sidebar-add-button");
              if (addButton) {
                (addButton as HTMLElement).click();
              }
            }}
            className="relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out group-hover:scale-110"
            aria-label="Create your first note"
          >
            {/* Arrow Icon */}
            <svg 
              className="w-8 h-8 transform group-hover:translate-x-1 transition-transform duration-300 ease-out" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 7l5 5m0 0l-5 5m5-5H6" 
              />
            </svg>
            
            {/* Hover Effect Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 ease-out"></div>
          </button>
          
          {/* Floating Label */}
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-md">
              Create Note
            </span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
            Your workspace is ready. Click the arrow above to create your first note and begin your journey.
          </p>
        </div>
      </div>
    </div>
  );
}
