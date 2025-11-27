"use client";
import { Sidebar } from "@/components/tailwind/ui/Sidebar";
import Menu from "@/components/tailwind/ui/menu";
import { NotificationSocketListener } from "@/contexts/notification/notificationSocketListner";
import { ShareProvider, useShare } from "@/contexts/ShareContext";
import useCachedNodes from "@/hooks/use-cachedNodes";
import useFetchRootNodes from "@/hooks/use-fetchRootData";
import { ChevronsRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { type Node as CustomNode } from "@/types/note";

function MarketplaceLayoutContent({ children }: { children: ReactNode }) {
  const [allRootNode, setAllRootNode] = useState<CustomNode[]>([]);
  const [selectedEditor, setSelectedEditor] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();

  const { setShareNoteId } = useShare();

  // Fetch root nodes for sidebar navigation
  const { rootNodes } = useFetchRootNodes();

  useEffect(() => {
    if (rootNodes && rootNodes.length > 0) {
      setAllRootNode(rootNodes);
    }
  }, [rootNodes]);

  // Cached nodes for sidebar functionality
  const {
    cachedChildNodes,
    setCachedChildNodes,
    fetchAndCacheChildren,
    fetchAndCacheChildrenForNode,
  } = useCachedNodes(allRootNode);

  // Simple handlers - just navigate, no note creation/editing logic
  const handleAddEditor = useCallback(() => {
    // Navigate to notes page where user can create notes
    router.push("/notes");
  }, [router]);

  const handleShare = useCallback(
    (noteId: string) => {
      setShareNoteId(noteId);
    },
    [setShareNoteId],
  );

  const handleSelectEditor = useCallback(
    (id: string) => {
      setSelectedEditor(id);
      router.push(`/notes/${id}`);
    },
    [router],
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <Sidebar
        key={allRootNode.map((n) => n.id).join("-")} // force re-render on rootNode change
        fallbackNotes={allRootNode}
        onAddEditor={handleAddEditor}
        onSelectEditor={handleSelectEditor}
        selectedEditor={selectedEditor}
        cachedChildNodes={cachedChildNodes}
        setCachedChildNodes={setCachedChildNodes}
        fetchAndCacheChildren={fetchAndCacheChildren}
        fetchAndCacheChildrenForNode={fetchAndCacheChildrenForNode}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpen={() => setIsSidebarOpen(true)}
        onShare={handleShare}
      />

      {/* Fixed Header */}
      <div className={`fixed top-0 left-0 right-0 z-[10] px-4 py-4 flex justify-between items-center gap-2 sm:gap-1 bg-background dark:bg-background ${isSidebarOpen ? "lg:left-[15rem]" : ""}`}>
        {/* Mobile Toggle */}
        {!isSidebarOpen && (
          <button
            type="button"
            className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg"
            onClick={() => setIsSidebarOpen(true)}
          >
            <ChevronsRight className="w-5 h-5 text-gray-800 dark:text-gray-200" />
          </button>
        )}
        {isSidebarOpen && <div></div>}
        <Menu />
      </div>

      {/* Main Content */}
      <main
        className={`relative flex flex-col flex-1 items-center gap-4 py-4 pt-16 sm:px-5 overflow-x-hidden ${
          isSidebarOpen ? "lg:ml-[15rem]" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <ShareProvider>
      <NotificationSocketListener />
      <MarketplaceLayoutContent>{children}</MarketplaceLayoutContent>
    </ShareProvider>
  );
}

