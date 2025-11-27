"use client";

import { toast } from "sonner";

export default function CopyLinkButton() {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-3 py-1 text-sm bg-accent rounded-lg text-muted-foreground hover:text-gray-700 dark:hover:text-gray-100 font-semibold"
    >
      Copy Link
    </button>
  );
}
