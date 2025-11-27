"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/hooks/use-auth";
import { useNoteChildren } from "@/hooks/use-notes";

import { isOwner } from "@/services-frontend/user/userServices";
import { usePathname } from "next/navigation";
import { ChevronRight, FileText, Loader2, MoreHorizontal, Plus } from "lucide-react";

import clsx from "clsx";

// Simple Tooltip component
const Tooltip = ({
  children,
  content,
  disabled = false,
}: { children: React.ReactNode; content: string; disabled?: boolean }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
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

// Interface for cached nodes
interface CachedNode {
  id: string;
  title: string;
  parentId: string;
  icon?: string;
  children: { _id: string; title: string; icon?: string; userId?: string; userEmail?: string }[];
  hasChildren?: boolean;
  userId?: string;
  userEmail?: string;
}

// Interface for cached nodes by parent ID
interface CachedNodes {
  [parentId: string]: CachedNode[];
}

interface RenderChildrenProps {
  parentId: string;
  openNodeIds: Set<string>;
  selectedEditor: string | null;
  onSelectEditor: (id: string) => void;
  onAddEditor: (parentId: string) => void;
  toggleNode: (id: string) => void;
  childrenNotes: CachedNodes;
  cachedChildNodes: CachedNodes;
  setCachedChildNodes: React.Dispatch<React.SetStateAction<CachedNodes>>;
  onDropdownToggle: (e: React.MouseEvent, nodeId: CachedNode | null) => void;
}

export default function RenderChildren({
  parentId,
  openNodeIds,
  selectedEditor,
  onSelectEditor,
  onAddEditor,
  toggleNode,
  childrenNotes,
  cachedChildNodes,
  setCachedChildNodes,
  onDropdownToggle,
}: RenderChildrenProps) {

  const { user } = useAuth();
  const { getChildren } = useNoteChildren();
  
  const isOpen = openNodeIds.has(parentId);
  // Use React Query to fetch children
  const { data: childrenData, isLoading: loading, error } = getChildren(parentId);

  // Update cache when data is fetched
  useEffect(() => {
    if (isOpen && childrenData && !error) {
      const newChildren = childrenData.children && Array.isArray(childrenData.children) 
        ? childrenData.children.map((child) => ({
            id: child._id,
            title: child.title,
            parentId: parentId,
            icon: child.icon || "",
            children: [],
            hasChildren: false,
            userId: child.userId,
            userEmail: child.userEmail,
          }))
        : [];
      
      // Only update if data has actually changed
      const currentChildren = cachedChildNodes[parentId] || [];
      const hasChanged = JSON.stringify(currentChildren.map(c => ({ id: c.id, title: c.title, icon: c.icon }))) !== 
                        JSON.stringify(newChildren.map(c => ({ id: c.id, title: c.title, icon: c.icon })));
      
      if (hasChanged) {
       setCachedChildNodes ((prev) => ({
          ...prev,
          [parentId]: newChildren,
        }));
      }
    }
  }, [isOpen, childrenData, error, parentId, cachedChildNodes]);

  // Get children from cache
  const children = childrenNotes[parentId] || [];

  // If the node is open but we're still loading children, show a loading indicator
  if (isOpen && loading && !cachedChildNodes[parentId]) {
    return (
      <div className="flex items-center gap-2 py-2 pl-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!isOpen || children.length === 0) return null;

  return (
    <>
      {children.map((child) => {
        const isChildOpen = openNodeIds.has(child.id);

        // Check if this node has or might have children
        // const hasChildren = child.hasChildren || child.children?.length > 0;
        const hasChildren = true;
        const cachedChildren = cachedChildNodes[child.id];
        const hasChildrenInCache = cachedChildren && cachedChildren.length > 0;
        const mightHaveChildren = hasChildren || hasChildrenInCache;
        const [isHovered, setIsHovered] = useState(false);
        const pathname = usePathname();

        const noteIdFromPath = useMemo(() => {
          if (!pathname) return null;
          const pathParts = pathname.split("/");
          const noteId = pathParts.pop();
          return noteId && noteId !== "notes" ? noteId : null;
        }, [pathname]);

        return (
          <li
            key={child.id}
            className="pl-2 text-gray-700 dark:text-gray-300 cursor-pointer font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onSelectEditor(child.id);
            }}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onSelectEditor(child.id);
              }
            }}
          >
            <div
              className={clsx(
                "group flex gap-2 pl-1 pr-2 items-center justify-between p-1 rounded-lg",
                noteIdFromPath === child.id && "font-bold dark:bg-[#2c2c2c] bg-gray-100",
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="flex gap-2 pl-1 items-center relative flex-1 min-w-0">
                {/* Static icon fades on hover */}
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {mightHaveChildren && isHovered ? (
                    <button
                      type="button"
                      className="bg-gray-50 dark:bg-[#121212] rounded-sm absolute left-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNode(child.id);
                      }}
                    >
                      <ChevronRight
                        className={clsx(
                          "h-5 w-5 transition-transform duration-200",
                          isChildOpen && "rotate-90"
                        )}
                      />
                    </button>
                  ) : (
                    <div>
                      {child.icon ? <span className="text-md">{child.icon}</span> : <FileText className="h-4 w-4" />}
                    </div>
                  )}
                </div>
                <span
                  className={`ml-2 truncate txt-eclips min-w-0 text-sm
    text-[#5F5E5B] 
    ${selectedEditor === child.id
                      ? 'dark:text-white'
                      : 'dark:text-[#9B9B9B]'
                    }`}
                >
                  {child.title}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDropdownToggle(e, child);
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {(() => {
                  const userOwnsNote = isOwner(child.userEmail, false, user);

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
                            onAddEditor(child.id);
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

            {/* Recursive rendering - always try to render when open */}
            {isChildOpen && (
              <ul className="ml-1 space-y-2">
                <RenderChildren
                  parentId={child.id}
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

            {isChildOpen && hasChildrenInCache === false && (
              <div style={{ color: "rgba(70, 68, 64, 0.45)" }}
                className="  text-sm ml-2 truncate txt-eclips min-w-0
                             text-[rgba(70,68,64,0.45)]
                             dark:!text-gray-400"
                >
                  No pages inside
              </div>
            )}
          </li>
        );
      })}
    </>
  );
}
