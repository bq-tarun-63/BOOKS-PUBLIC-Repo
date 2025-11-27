"use client";

import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoverPlaceholderCardProps {
  imageUrl?: string;
  message?: string;
  fallbackMessage?: string;
}

export function CoverPlaceholderCard({
  imageUrl,
  message,
  fallbackMessage = "Add a link or upload an image to see a preview.",
}: CoverPlaceholderCardProps) {
  if (imageUrl) {
    return (
      <div className="w-full overflow-hidden rounded-lg border border-zinc-200 shadow-sm dark:border-zinc-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Preview cover" className="h-64 w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-[2.15/1] w-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-6 text-center dark:border-zinc-800 dark:bg-zinc-900/50",
      )}
    >
      <ImageOff className="mb-4 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
      <p className="text-lg font-semibold text-zinc-500 dark:text-zinc-400">{message || fallbackMessage}</p>
    </div>
  );
}

