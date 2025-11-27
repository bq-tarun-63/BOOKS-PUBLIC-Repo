import RenderChildren from "@/components/tailwind/ui/renderChild";
import { useAuth } from "@/hooks/use-auth";
import type { Node } from "@/types/note";
import clsx from "clsx";
import { ChevronDown, ChevronRight, FileText, MoreHorizontal, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isOwner } from "@/services-frontend/user/userServices";

// Type for cached nodes
interface CachedNode {
  id: string;
  title: string;
  parentId: string;
  icon?: string;
  children: { _id: string; title: string; icon?: string; userId?: string; userEmail?: string }[];
  hasChildren?: boolean;
}

// Interface for cached nodes by parent ID
interface CachedNodes {
  [parentId: string]: CachedNode[];
}

interface UseRenderNodeProps {
  editorTitles: Node[];
  openNodeIds: Set<string>;
  selectedEditor: string | null;
  onSelectEditor: (id: string) => void;
  toggleNode: (id: string) => void;
  onAddEditor: (parentId: string) => void;
  childrenNotes: CachedNodes;
  cachedChildNodes: CachedNodes;
  setCachedChildNodes: React.Dispatch<React.SetStateAction<CachedNodes>>;
  onDropdownToggle: (e: React.MouseEvent, nodeId: Node | CachedNode | null) => void;
}

// Simple Tooltip component
const Tooltip = ({
  children,
  content,
  disabled = false,
}: { children: React.ReactNode; content: string; disabled?: boolean }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  if (disabled) return <>{children}</>;

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
      });
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <div className="relative block w-full">
      <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {children}
      </div>
      {isVisible &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap z-[9999] pointer-events-none"
            style={{
              top: position.top - 12,
              left: position.left,
              transform: "translateY(-50%)",
            }}
          >
            {content}
            <div className="absolute top-1/2 right-full transform -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
          </div>,
          document.body,
        )}
    </div>
  );
};

export default function useRenderNode({
  editorTitles,
  openNodeIds,
  selectedEditor,
  onSelectEditor,
  toggleNode,
  onAddEditor,
  childrenNotes,
  cachedChildNodes,
  setCachedChildNodes,
  onDropdownToggle,
}: UseRenderNodeProps) {
  const { user } = useAuth();

  return editorTitles.map((entry) => {
    const isOpen = openNodeIds.has(entry.id);
    const [isHovered, setIsHovered] = useState(false);

    // Check if this node has or might have children
    const hasChildren = entry.children && entry.children.length > 0;
    const cachedChildren = cachedChildNodes[entry.id];
    const hasChildrenInCache = cachedChildren && cachedChildren.length > 0;
    const mightHaveChildren = hasChildren || hasChildrenInCache;

    const userOwnsNote = isOwner(entry.userEmail , true, user);
    const isPublicNote = entry?.isPublicNote === true;
    const showGreenLine = userOwnsNote && isPublicNote;
    const pathname = usePathname();

    const noteIdFromPath = useMemo(() => {
      if (!pathname) return null;
      const pathParts = pathname.split("/");
      const noteId = pathParts.pop();
      return noteId && noteId !== "notes" ? noteId : null;
    }, [pathname]);


    return (
      <li
        key={entry.id}
        className={clsx("text-gray-700 dark:text-gray-300 cursor-pointer font-medium")}
        onClick={() => onSelectEditor(entry.id)}
        onKeyUp={(e) => {
          if (e.key === "Enter") onSelectEditor(entry.id);
        }}
      >
        <div
          className={clsx(
            "group flex gap-2 pl-1 pr-2 items-center justify-between p-1",
            showGreenLine ? "rounded-r-lg" : "rounded-lg",
            noteIdFromPath === entry.id && "font-bold dark:bg-[#2c2c2c] bg-gray-100",
            showGreenLine && "border-l-4",
          )}
          style={showGreenLine ? { borderLeftColor: "rgb(63 135 85)", borderRadius: "6px" } : { borderRadius: "6px" }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="flex gap-1.5 pl-1 items-center relative flex-1 min-w-0 pr-2">
            {/* Static icon fades on hover */}
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {mightHaveChildren && isHovered ? (
                <button
                  type="button"
                  className="bg-gray-50 dark:bg-[#121212] rounded-sm absolute left-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(entry.id);
                  }}
                >
                  <ChevronRight
                    className={clsx(
                      "h-5 w-5 transition-transform duration-200",
                      isOpen && "rotate-90"
                    )}
                  />
                </button>
              ) : (
                <div>
                  {entry.icon ? <span className="text-md">{entry.icon}</span> : <FileText className="w-4 h-4" />}
                </div>
              )}
            </div>

            <Tooltip content={entry.userEmail || "Unknown owner"} disabled={userOwnsNote}>
              <span
                className={`ml-1 truncate txt-eclips text-sm min-w-0
                    text-[#5F5E5B] 
                    ${selectedEditor === entry.id
                    ? 'dark:text-white'
                    : 'dark:text-[#9B9B9B]'
                  }`}
              >
                {entry.title}
              </span>            </Tooltip>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              onClick={(e) => {
                e.stopPropagation();
                onDropdownToggle(e, entry);
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {(() => {
              return (
                <Tooltip content="You are not the owner of this note" disabled={userOwnsNote}>
                  <button
                    type="button"
                    disabled={!userOwnsNote}
                    className={`opacity-0 group-hover:opacity-100 transition-all duration-300 ${userOwnsNote
                      ? "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                      : "text-gray-300 dark:text-gray-600 cursor-not-allowed pt-1"
                      }`}
                    onClick={(e) => {
                      if (userOwnsNote) {
                        e.stopPropagation();
                        onAddEditor(entry.id);
                      }
                    }}
                  >
                    <Plus className="h-4 w-5" />
                  </button>
                </Tooltip>
              );
            })()}
          </div>
        </div>

        {/* Recursive children rendering - always attempt when open */}
        {isOpen && (
          <ul className="ml-1  space-y-2">
            <RenderChildren
              parentId={entry.id}
              openNodeIds={openNodeIds}
              selectedEditor={selectedEditor}
              onSelectEditor={onSelectEditor}
              onAddEditor={onAddEditor}
              toggleNode={toggleNode}
              childrenNotes={childrenNotes}
              cachedChildNodes={cachedChildNodes}
              setCachedChildNodes={setCachedChildNodes}
              onDropdownToggle={onDropdownToggle}
            />
          </ul>
        )}
      </li>
    );
  });
}