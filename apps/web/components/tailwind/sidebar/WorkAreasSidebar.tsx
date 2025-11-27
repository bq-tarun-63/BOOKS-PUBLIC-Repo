"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, ChevronsRight, MoreVertical, Plus } from "lucide-react";
import { useWorkAreaContext } from "@/contexts/workAreaContext";
import { cn } from "@/lib/utils";
import type { Node as CustomNode } from "@/types/note";
import { AddIcon } from "@/components/tailwind/ui/icons/AddIcon";
import CreateWorkAreaModal from "./CreateWorkAreaModal";
import { Skeleton } from "@/components/tailwind/ui/skeleton";
import { DropdownMenu, DropdownMenuIcons } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";
import WorkAreaAddMembersModal from "../settings/modals/WorkAreaAddMembersModal";
import WorkAreaViewModal from "../settings/modals/WorkAreaViewModal";
import type { WorkArea } from "@/types/workarea";

interface WorkAreasSidebarProps {
  NodeRenderer: React.ComponentType<{
    nodes: CustomNode[];
    onReorder: (ids: string[]) => void;
    isPublic?: boolean;
  }>;
  ScrollableContainer: React.ComponentType<{
    children: React.ReactNode;
    preserveScroll?: boolean;
    className?: string;
  }>;
  openNodeIds: Set<string>;
  toggleNode: (id: string) => void;
  editorTitles: CustomNode[];
  onReorder?: (ids: string[]) => void;
  onAddPage?: (workAreaId: string) => void;
}

export default function WorkAreasSidebar({ 
  NodeRenderer, 
  ScrollableContainer,
  openNodeIds,
  toggleNode,
  editorTitles,
  onReorder = () => {},
  onAddPage
}: WorkAreasSidebarProps) {
  const { workAreas, isLoading, refreshWorkAreas } = useWorkAreaContext();
  const [isOpen, setIsOpen] = useState(true);
  const [openWorkAreas, setOpenWorkAreas] = useState<Set<string>>(new Set());
  const [hoveredWorkAreas, setHoveredWorkAreas] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [menuState, setMenuState] = useState<{
    workArea: WorkArea;
    position: { top: number; left: number; width: number };
  } | null>(null);
  const [activeModal, setActiveModal] = useState<{
    type: "addMembers" | "settings";
    workArea: WorkArea;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Initialize all work areas as open (only once when workAreas first load)
  // Use a ref to track if we've initialized to prevent resetting on re-renders
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (workAreas.length > 0 && !hasInitializedRef.current) {
      const initialOpenSet = new Set(workAreas.map(wa => String(wa._id)));
      setOpenWorkAreas(initialOpenSet);
      hasInitializedRef.current = true;
    }
  }, [workAreas.length]); // Only depend on workAreas.length, not the size of openWorkAreas

  useEffect(() => {
    if (!menuState) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuState(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuState(null);
      }
    };

    const handleScrollOrResize = () => {
      setMenuState(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [menuState]);

  const openMenuForWorkArea = (workArea: WorkArea, target: HTMLButtonElement) => {
    if (typeof window === "undefined") return;
    const rect = target.getBoundingClientRect();
    const width = 220;
    const padding = 12;
    const left = Math.min(
      Math.max(rect.right + window.scrollX - width, padding),
      window.innerWidth - width - padding
    );
    const top = rect.bottom + window.scrollY + 6;

    setMenuState({
      workArea,
      position: {
        top,
        left,
        width,
      },
    });
  };

  const handleMenuAction = (type: "addMembers" | "settings", workArea: WorkArea) => {
    setMenuState(null);
    setActiveModal({ type, workArea });
  };

  const workAreaMenuItems = (workArea: WorkArea): DropdownMenuItemProps[] => [
    {
      id: "add-members",
      label: "Add members",
      icon: <DropdownMenuIcons.AddMembers />,
      onClick: () => handleMenuAction("addMembers", workArea),
    },
    {
      id: "workarea-settings",
      label: "Work area settings",
      icon: <DropdownMenuIcons.View />,
      onClick: () => handleMenuAction("settings", workArea),
    },
  ];

  // Get root pages for each work area
  // Root pages are identified by: parentId === null AND workAreaId === workAreaId
  const workAreaRootPages = useMemo(() => {
    const pagesByWorkArea: Record<string, CustomNode[]> = {};
    
    workAreas.forEach((workArea) => {
      const workAreaId = String(workArea._id);
      
      // Filter root pages: parentId === null AND workAreaId matches
      // This identifies root pages for this work area
      const rootPages = editorTitles.filter(
        (note) => 
          (note.parentId === null || note.parentId === undefined) &&
          String(note.workAreaId) === workAreaId
      );
      
      pagesByWorkArea[workAreaId] = rootPages;
    });
    
    return pagesByWorkArea;
  }, [workAreas, editorTitles]);


  return (
    <div className="relative text-sm leading-5 mb-8">
      <div className="flex items-center justify-between gap-2 py-2 px-2 ml-2 rounded-md group">
        <span className="text-xs text-[#5F5E5B] dark:text-[#9B9B9B] f-500">WorkArea</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCreateModalOpen(true);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer flex-shrink-0 p-1 rounded-md hover:bg-muted/30"
            title="Create new work area"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div
            className="cursor-pointer hover:bg-muted/30 rounded-md px-1 py-1"
            onClick={toggleDropdown}
          >
            <ChevronsRight
              className={cn(
                "w-4 h-4 text-gray-400 transition-transform duration-300",
                isOpen && "rotate-90"
              )}
            />
          </div>
        </div>
      </div>

      {isOpen && (
        <>
          <ScrollableContainer>
            {isLoading ? (
              <div className="space-y-1 pl-2">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="pl-2">
                    <div className="group flex gap-2 pl-1 pr-2 items-center justify-between p-1 rounded-lg">
                      <div className="flex gap-1.5 pl-1 items-center relative flex-1 min-w-0 pr-2">
                        {/* Icon skeleton */}
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          <Skeleton className="w-4 h-4 rounded" />
                        </div>
                        {/* Name skeleton */}
                        <Skeleton className="ml-1 h-4 w-24 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : workAreas.length === 0 ? (
              <div className="pl-4 py-2 text-xs text-[#5F5E5B] dark:text-[#9B9B9B]">
                No work areas
              </div>
            ) : (
              <div className="space-y-1">
                {workAreas.map((workArea) => {
                  const workAreaId = String(workArea._id);
                  const rootPages = workAreaRootPages[workAreaId] || [];
                  const isWorkAreaOpen = openWorkAreas.has(workAreaId);
                  const hasPages = rootPages.length > 0;
                  const isHovered = hoveredWorkAreas.has(workAreaId);
                  
                  // Get first letter of work area name for icon fallback
                  const firstLetter = workArea.name?.charAt(0)?.toUpperCase() || "W";
                  
                  return (
                    <div key={workAreaId} className="pl-2">
                      {/* Work Area Heading - Similar to note rendering */}
                      <div
                        className="group flex gap-2 pl-1 pr-2 items-center justify-between p-1 rounded-lg hover:bg-muted/30"
                        onMouseEnter={() => {
                          setHoveredWorkAreas(prev => new Set(prev).add(workAreaId));
                        }}
                        onMouseLeave={() => {
                          setHoveredWorkAreas(prev => {
                            const next = new Set(prev);
                            next.delete(workAreaId);
                            return next;
                          });
                        }}
                      >
                        <div className="flex gap-1.5 pl-1 items-center relative flex-1 min-w-0 pr-2">
                          {/* Icon/Toggle area at the start - same as notes */}
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 relative">
                            {/* Icon - always rendered, fades on hover when pages exist */}
                            <div 
                              className={cn(
                                "w-5 h-5 flex items-center justify-center transition-opacity duration-300",
                                hasPages && isHovered && "opacity-0"
                              )}
                            >
                              {workArea.icon ? (
                                <span className="text-md leading-none">{workArea.icon}</span>
                              ) : (
                                <div className="w-4 h-4 rounded bg-gray-200 dark:bg-zinc-600 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {firstLetter}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Toggle button - always rendered when pages exist, visible on hover */}
                            {hasPages && (
                              <button
                                type="button"
                                className="absolute left-0 top-0 w-5 h-5 bg-gray-50 dark:bg-[#121212] rounded-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 active:opacity-100 flex items-center justify-center z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Toggle the work area open/closed state
                                  setOpenWorkAreas(prev => {
                                    const next = new Set(prev);
                                    if (next.has(workAreaId)) {
                                      next.delete(workAreaId);
                                    } else {
                                      next.add(workAreaId);
                                    }
                                    return next;
                                  });
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                                aria-label={isWorkAreaOpen ? "Collapse work area" : "Expand work area"}
                              >
                                <ChevronRight
                                  className={cn(
                                    "h-5 w-5 transition-transform duration-200",
                                    isWorkAreaOpen && "rotate-90"
                                  )}
                                />
                              </button>
                            )}
                          </div>

                          {/* Work Area Name */}
                          <span className="ml-1 truncate txt-eclips text-sm min-w-0 font-medium text-[#5F5E5B] dark:text-[#9B9B9B]">
                            {workArea.name}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1 flex-shrink-0">
                          {onAddPage && (
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddPage(workAreaId);
                              }}
                              title="Add page to work area"
                            >
                              <AddIcon className="h-4 w-5" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer p-1 rounded-md hover:bg-muted/40"
                            title="More options"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMenuForWorkArea(workArea, e.currentTarget);
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Root Pages under this work area */}
                      {isWorkAreaOpen && rootPages.length > 0 && (
                        <ul className="pl-2 space-y-1 mt-1" id="navigation-items">
                          <NodeRenderer 
                            nodes={rootPages} 
                            onReorder={() => {}} 
                          />
                        </ul>
                      )}
                      
                      {isWorkAreaOpen && rootPages.length === 0 && (
                        <div className="pl-4 py-1 text-xs text-[#5F5E5B] dark:text-[#9B9B9B]">
                          No pages
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollableContainer>
        </>
      )}
      
      {/* Work area actions menu */}
      {menuState && typeof window !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[10000] bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 rounded-md"
          style={{
            top: menuState.position.top,
            left: menuState.position.left,
            width: menuState.position.width,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu items={workAreaMenuItems(menuState.workArea)} />
        </div>,
        document.body
      )}

      {/* Create Work Area Modal */}
      <CreateWorkAreaModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Add members modal */}
      {activeModal?.type === "addMembers" && (
        <WorkAreaAddMembersModal
          workArea={activeModal.workArea}
          isOpen
          onClose={() => setActiveModal(null)}
          onMembersAdded={async () => {
            await refreshWorkAreas(true);
          }}
        />
      )}

      {/* Work area settings modal */}
      {activeModal?.type === "settings" && (
        <WorkAreaViewModal
          workArea={activeModal.workArea}
          isOpen
          onClose={() => setActiveModal(null)}
          onMembersUpdated={async () => {
            await refreshWorkAreas(true);
          }}
          onWorkAreaDeleted={async () => {
            await refreshWorkAreas(true);
          }}
        />
      )}
    </div>
  );
}

