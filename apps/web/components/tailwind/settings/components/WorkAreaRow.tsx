"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, X, ChevronDown, Lock, CheckCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuIcons } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";
import { useWorkAreaContext } from "@/contexts/workAreaContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { useAuth } from "@/hooks/use-auth";
import type { WorkArea } from "@/types/workarea";
import { cn } from "@/lib/utils";
import WorkAreaAddMembersModal from "../modals/WorkAreaAddMembersModal";
import WorkAreaViewModal from "../modals/WorkAreaViewModal";
import Image from "next/image";

interface WorkAreaRowProps {
  workArea: WorkArea;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (name: string) => void;
  onCancelEdit: () => void;
  index: number;
  isSaving?: boolean;
  isNewWorkArea?: boolean;
}

export default function WorkAreaRow({
  workArea,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  index,
  isSaving = false,
  isNewWorkArea = false,
}: WorkAreaRowProps) {
  const [name, setName] = useState(workArea.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [optionsPosition, setOptionsPosition] = useState({ top: 0, left: 0, width: 180 });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAccessDropdownOpen, setIsAccessDropdownOpen] = useState(false);
  const accessButtonRef = useRef<HTMLButtonElement>(null);
  const accessDropdownRef = useRef<HTMLDivElement>(null);
  const [accessDropdownPosition, setAccessDropdownPosition] = useState({ top: 0, left: 0, width: 160 });

  const { workspaceMembers } = useWorkspaceContext();
  const { workAreas, updateWorkspaceWorkArea, deleteWorkspaceWorkArea, refreshWorkAreas } = useWorkAreaContext();
  const { user } = useAuth();
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setName(workArea.name);
  }, [workArea.name]);

  // Check if current user is a member
  const isMember = workArea.members?.some(
    (m) => m.userEmail === user?.email
  ) || false;

  // Get owner info
  const owner = workArea.members?.find((m) => m.role === "owner");
  const ownerMember = workspaceMembers.find(
    (m) => m.userEmail === owner?.userEmail || m.userId === String(owner?.userId)
  );

  // Check if current user is the owner
  const isOwner = owner?.userEmail === user?.email;

  // Calculate access level display
  const accessDisplay = workArea.accessLevel === "open" ? "Open" : workArea.accessLevel === "closed" ? "Closed" : "Private";

  // Handle view work area
  const handleViewWorkArea = () => {
    setIsOptionsOpen(false);
    setShowViewModal(true);
  };

  // Handle add members
  const handleAddMembers = () => {
    setIsOptionsOpen(false);
    setShowAddMembersModal(true);
  };

  // Position the more options menu
  const openOptions = () => {
    if (moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect();
      const menuHeight = 200; // Approximate height of the menu (5 items + dividers)
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If not enough space below but enough space above, position above
      const shouldPositionAbove = spaceBelow < menuHeight && spaceAbove > menuHeight;
      
      const top = shouldPositionAbove 
        ? rect.top - menuHeight - 6  // Position above with 6px gap
        : rect.bottom + 6;            // Position below with 6px gap
      
      setOptionsPosition({ 
        top, 
        left: rect.right - 180, 
        width: 180 
      });
      setIsOptionsOpen(true);
    }
  };

  // Close more options when clicking outside and prevent body scroll
  useEffect(() => {
    if (!isOptionsOpen) return;

    // Prevent body scroll when menu is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (optionsRef.current && optionsRef.current.contains(target)) return;
      if (moreBtnRef.current && moreBtnRef.current.contains(target)) return;
      setIsOptionsOpen(false);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOptionsOpen(false);
    };

    // Update position on scroll/resize
    const updatePosition = () => {
      if (moreBtnRef.current && isOptionsOpen) {
        const rect = moreBtnRef.current.getBoundingClientRect();
        const menuHeight = 200;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const shouldPositionAbove = spaceBelow < menuHeight && spaceAbove > menuHeight;
        const top = shouldPositionAbove 
          ? rect.top - menuHeight - 6
          : rect.bottom + 6;
        setOptionsPosition({ 
          top, 
          left: rect.right - 180, 
          width: 180 
        });
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("keydown", handleKey, true);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleKey, true);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      // Restore body scroll
      document.body.style.overflow = originalOverflow;
    };
  }, [isOptionsOpen]);

  // Close access dropdown when clicking outside
  useEffect(() => {
    if (!isAccessDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accessDropdownRef.current && accessDropdownRef.current.contains(target)) return;
      if (accessButtonRef.current && accessButtonRef.current.contains(target)) return;
      setIsAccessDropdownOpen(false);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAccessDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [isAccessDropdownOpen]);

  // Update access dropdown position
  useEffect(() => {
    if (isAccessDropdownOpen && accessButtonRef.current) {
      const updatePosition = () => {
        const rect = accessButtonRef.current?.getBoundingClientRect();
        if (rect) {
          setAccessDropdownPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: Math.max(160, rect.width),
          });
        }
      };
      
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isAccessDropdownOpen]);

  // Handle access level change
  const handleAccessChange = async (newAccessLevel: "open" | "closed" | "private") => {
    if (!isOwner) return;
    
    try {
      const workAreaId = workArea._id;
      if (!workAreaId) {
        console.error("Work area ID is missing", workArea);
        return;
      }
      
      await updateWorkspaceWorkArea(workAreaId, undefined, undefined, undefined, newAccessLevel);
      setIsAccessDropdownOpen(false);
    } catch (err) {
      console.error("Failed to update work area access level", err);
    }
  };

  // Build access menu items
  const accessMenuItems: DropdownMenuItemProps[] = [
    {
      id: 'open',
      label: "Open",
      onClick: () => handleAccessChange("open"),
      selected: workArea.accessLevel === "open",
      rightElement: workArea.accessLevel === "open" ? <CheckCircle className="w-3 h-3" /> : undefined,
      className: "text-xs text-zinc-600 dark:text-zinc-400", // Match original styling
    },
    {
      id: 'closed',
      label: "Closed",
      onClick: () => handleAccessChange("closed"),
      selected: workArea.accessLevel === "closed",
      rightElement: workArea.accessLevel === "closed" ? <CheckCircle className="w-3 h-3" /> : undefined,
      className: "text-xs text-zinc-600 dark:text-zinc-400",
    },
    {
      id: 'private',
      label: "Private",
      onClick: () => handleAccessChange("private"),
      selected: workArea.accessLevel === "private",
      rightElement: workArea.accessLevel === "private" ? <CheckCircle className="w-3 h-3" /> : undefined,
      className: "text-xs text-zinc-600 dark:text-zinc-400",
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSaving) {
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleSave = () => {
    if (isSaving) return;
    const trimmedName = name.trim();
    if (trimmedName) {
      onSaveEdit(trimmedName);
    } else {
      handleCancel();
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    setName(workArea.name);
    onCancelEdit();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isSaving) {
      e.preventDefault();
      inputRef.current?.focus();
      return;
    }
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && (
      relatedTarget.closest('button') ||
      relatedTarget.closest('[role="button"]')
    )) {
      return;
    }
    handleSave();
  };

  const handleRenameFromMenu = () => {
    setIsOptionsOpen(false);
    onStartEdit();
  };

  const handleDeleteClick = () => {
    setIsOptionsOpen(false);
    setIsDeleteConfirmOpen(true);
    setIsDeleting(false);
  };

  // Build menu items array
  const menuItems: DropdownMenuItemProps[] = [
    {
      id: 'view-workarea',
      label: "View work area",
      icon: <DropdownMenuIcons.View />,
      onClick: () => {
        setIsOptionsOpen(false);
        setShowViewModal(true);
      },
    },
    {
      id: 'rename',
      label: "Rename",
      icon: <DropdownMenuIcons.Rename />,
      onClick: handleRenameFromMenu,
    },
    {
      id: 'add-members',
      label: "Add members",
      icon: <DropdownMenuIcons.AddMembers />,
      onClick: () => {
        setIsOptionsOpen(false);
        setShowAddMembersModal(true);
      },
    },
    {
      id: 'delete',
      label: "Delete",
      icon: <DropdownMenuIcons.Delete />,
      variant: 'destructive',
      onClick: handleDeleteClick,
    },
  ];

  return (
    <div className="flex h-full items-stretch shadow-[inset_0_-1px_0_var(--c-tabDivCol)]">
      {/* Work Area name */}
      <div className="w-[35%] min-w-[250px] px-3 flex items-center">
        <div className="min-w-[250px]">
          <div className="flex items-center text-sm w-full justify-between">
            <div className="flex items-center gap-2.5 mt-1 mb-1">
              {/* Only show icon if not creating a new work area, or if editing an existing one */}
              {!(isNewWorkArea && isEditing) && (
                <div className="relative flex-shrink-0">
                  {workArea.icon ? (
                    <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full shadow-none outline outline-1 outline-offset-[-1px] outline-zinc-300 dark:outline-zinc-600">
                      <div className="box-content rounded-full leading-7 w-7 h-7 overflow-hidden text-center bg-zinc-100 dark:bg-zinc-800 select-none opacity-100 flex items-center justify-center">
                        <span className="text-base leading-none">{workArea.icon}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full shadow-none outline outline-1 outline-offset-[-1px] outline-zinc-300 dark:outline-zinc-600">
                      <div className="box-content rounded-full leading-7 w-7 h-7 overflow-hidden text-center text-xs bg-zinc-100 dark:bg-zinc-800 select-none text-zinc-600 dark:text-zinc-400 opacity-100 flex items-center justify-center">
                        <div>
                          {workArea.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="max-w-[163px] flex-1 min-w-0">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => !isSaving && setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    disabled={isSaving}
                    className="w-full text-sm font-medium text-zinc-900 dark:text-zinc-100 bg-transparent border-b-2 border-blue-500 dark:border-blue-400 outline-none px-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                ) : (
                  <div
                    title={workArea.name}
                    className="h-[17px] self-stretch text-sm font-medium leading-[18px] whitespace-nowrap overflow-hidden text-ellipsis text-zinc-900 dark:text-zinc-100"
                  >
                    {workArea.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Joined status */}
      <div className="w-[20%] min-w-[120px] px-3 flex items-center">
        <div className="min-w-[120px]">
          <div
            title={isMember ? "Joined" : "Not joined"}
            className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {isMember ? "Joined" : "Not joined"}
          </div>
        </div>
      </div>

      {/* Owner */}
      <div className="w-[25%] min-w-[150px] px-3 flex items-center">
        <div className="min-w-[150px]">
          {ownerMember ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full shadow-none outline outline-1 outline-offset-[-1px] outline-zinc-300 dark:outline-zinc-600 flex-shrink-0">
                <div className="box-content rounded-full leading-7 w-7 h-7 overflow-hidden text-center text-xs bg-zinc-100 dark:bg-zinc-800 select-none text-zinc-600 dark:text-zinc-400 opacity-100">
                  <div>
                    {ownerMember.userName?.charAt(0).toUpperCase() ||
                      ownerMember.userEmail?.charAt(0).toUpperCase() ||
                      "U"}
                  </div>
                </div>
              </div>
              <div className="max-w-[163px] min-w-0 flex-1">
                <div
                  title={ownerMember.userName || ownerMember.userEmail}
                  className="h-[17px] self-stretch text-sm font-medium leading-[18px] whitespace-nowrap overflow-hidden text-ellipsis text-zinc-900 dark:text-zinc-100"
                >
                  {ownerMember.userName 
                    ? ownerMember.userName.split(' ')[0]
                    : ownerMember.userEmail?.split('@')[0] || ownerMember.userEmail}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">—</div>
          )}
        </div>
      </div>

      {/* Access */}
      <div className="w-[15%] min-w-[90px] px-3 flex items-center">
        <div className="min-w-[90px] w-full">
          <button
            ref={isOwner ? accessButtonRef : undefined}
            role="button"
            tabIndex={isOwner ? 0 : -1}
            disabled={!isOwner}
            onClick={(e) => {
              if (!isOwner) return;
              e.stopPropagation();
              setIsAccessDropdownOpen(!isAccessDropdownOpen);
            }}
            className={cn(
              "user-select-none transition-colors duration-200 ease-in text-xs inline-flex items-center justify-start gap-1 whitespace-nowrap rounded-md px-2 py-1",
              isOwner
                ? isAccessDropdownOpen
                  ? "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  : "text-zinc-600 dark:text-zinc-400 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                : "text-zinc-600 dark:text-zinc-400 cursor-not-allowed opacity-60"
            )}
          >
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{accessDisplay}</span>
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Access dropdown - via portal */}
      {isAccessDropdownOpen && isOwner && typeof window !== "undefined" && createPortal(
        <div
          ref={accessDropdownRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed z-[10000] bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 rounded-md min-w-[160px]"
          style={{
            top: accessDropdownPosition.top,
            left: accessDropdownPosition.left,
            width: accessDropdownPosition.width,
          }}
        >
          <DropdownMenu items={accessMenuItems} />
        </div>,
        document.body
      )}

      {/* Updated date */}
      <div className="w-[10%] min-w-[100px] px-3 flex items-center">
        <div className="min-w-[100px]">
          <div
            title={workArea.updatedAt ? new Date(workArea.updatedAt).toLocaleDateString() : "—"}
            className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {workArea.updatedAt ? new Date(workArea.updatedAt).toLocaleDateString() : "—"}
          </div>
        </div>
      </div>

      {/* Actions - More options (3-dot menu) */}
      <div className="w-[5%] min-w-[60px] px-3 flex items-center">
        <div className="min-w-[60px] w-full">
          <button
            role="button"
            tabIndex={0}
            ref={moreBtnRef}
            onClick={(e) => {
              e.stopPropagation();
              openOptions();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="user-select-none transition-colors duration-200 ease-in cursor-pointer flex items-center h-6 px-0 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 text-zinc-900 dark:text-zinc-100 w-6 justify-center gap-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5 block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* More options menu - via portal */}
      {isOptionsOpen && typeof window !== "undefined" && createPortal(
        <div
          ref={optionsRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed z-[10000] bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 rounded-md w-[180px]"
          style={{ top: optionsPosition.top, left: optionsPosition.left, width: optionsPosition.width }}
        >
          <DropdownMenu items={menuItems} dividerAfter={[2]} />
        </div>,
        document.body
      )}

      {/* Add members modal */}
      <WorkAreaAddMembersModal
        workArea={workArea}
        isOpen={showAddMembersModal}
        onClose={() => setShowAddMembersModal(false)}
        onMembersAdded={async () => {
          // Refresh work areas to show updated member list
          await refreshWorkAreas(true);
        }}
      />

      {/* View work area modal */}
      <WorkAreaViewModal
        workArea={workArea}
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        onMembersUpdated={async () => {
          // Refresh work areas to show updated member list
          await refreshWorkAreas(true);
        }}
        onWorkAreaDeleted={async () => {
          // Refresh work areas after deletion
          await refreshWorkAreas(true);
        }}
      />

      {/* Delete confirmation modal */}
      {isDeleteConfirmOpen && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[11000] flex items-center justify-center"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 bg-black/30" onClick={() => {
            if (!isDeleting) {
              setIsDeleteConfirmOpen(false);
              setIsDeleting(false);
            }
          }} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 w-[440px] max-w-[90vw] p-4">
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Delete work area?</div>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This will remove <span className="font-medium text-zinc-900 dark:text-zinc-100">{workArea.name}</span> from your workspace. You can't undo this action.
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (!isDeleting) {
                    setIsDeleteConfirmOpen(false);
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                disabled={isDeleting}
                onClick={async (e) => {
                  if (isDeleting) return;
                  e.stopPropagation();
                  const workAreaId = workArea._id;
                  if (!workAreaId) {
                    console.error("Work area ID is missing", workArea);
                    return;
                  }
                  
                  setIsDeleting(true);
                  try {
                    await deleteWorkspaceWorkArea(workAreaId);
                    // Only close modal on success
                    setIsDeleteConfirmOpen(false);
                  } catch (err) {
                    console.error("Failed to delete work area", err);
                    // Keep modal open on error so user can retry
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

