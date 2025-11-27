"use client";
import { postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";
import { type ReactNode, createContext, useContext, useState } from "react";
interface ShareContextType {
  shareNoteId: string | null;
  setShareNoteId: (id: string | null) => void;
  removeSharedPage: (noteId: string) => Promise<void>;
}

const ShareContext = createContext<ShareContextType | undefined>(undefined);

export function ShareProvider({ children }: { children: ReactNode }) {
  const [shareNoteId, setShareNoteId] = useState<string | null>(null);

  const removeSharedPage = async (noteId: string) => {
    try {
      const response = await postWithAuth(`/api/note/removeShareAccess`, { noteId });

      if ("isError" in response && response.isError) {
        toast.error(response.message as string || "Failed to remove note. Please try again.");
        return;
      }

      toast.success("Note removed from shared list.");
    } catch (error) {
      console.error("Error in Removing Shared Note:", error);
      toast.error("There was an error. Please check your connection and try again.");
    }
  };

  return <ShareContext.Provider value={{ shareNoteId, setShareNoteId,removeSharedPage }}>{children}</ShareContext.Provider>;
}

export function useShare() {
  const context = useContext(ShareContext);
  if (context === undefined) {
    throw new Error("useShare must be used within a ShareProvider");
  }
  return context;
}
