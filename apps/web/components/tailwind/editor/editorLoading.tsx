// components/editor/EditorLoading.tsx
"use client";

export default function EditorLoading() {
  return (
    <div className="min-h-[500px] w-full bg-background dark:bg-background sm:rounded-lg p-5">
      {/* Spinner */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative w-4 h-4">
          <div className="absolute inset-0 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Loading content...
        </span>
      </div>

      {/* Skeleton Lines */}
      <div className="space-y-3">
        <div className="h-7 w-3/4 rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
        <div className="h-4 w-full rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
        <div className="h-4 w-full rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
        <div className="h-4 w-2/3 rounded animate-pulse bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
        <div className="h-24 w-full rounded animate-pulse mt-6 bg-[rgb(225,225,224)] dark:bg-[rgb(45,45,45)]" />
      </div>
    </div>
  );
}
