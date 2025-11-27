"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, ChevronDown, X, Plus, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuIcons } from "@/components/tailwind/ui/dropdown-menu";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import type { WorkspaceGroup, Members } from "@/types/workspace";
import { cn } from "@/lib/utils";

interface GroupRowProps {
  group: WorkspaceGroup;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (name: string) => void;
  onCancelEdit: () => void;
  index: number;
}

export default function GroupRow({
  group,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  index,
}: GroupRowProps) {
  const [name, setName] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [optionsPosition, setOptionsPosition] = useState({ top: 0, left: 0, width: 180 });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const {
    workspaceMembers,
    updateWorkspaceGroup,
    deleteWorkspaceGroup,
    workspaceGroups,
  } = useWorkspaceContext();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setName(group.name);
  }, [group.name]);

  // Get current group members
  const groupMemberEmails = group.members?.map((m) => m.userEmail) || [];
  const groupMemberIds = group.members?.map((m) => m.userId) || [];

  // Get members in the group
  const membersInGroup = workspaceMembers.filter(
    (member) =>
      groupMemberEmails.includes(member.userEmail) ||
      groupMemberIds.includes(member.userId)
  );

  // Get available members (not in group)
  const availableMembers = workspaceMembers.filter(
    (member) =>
      !groupMemberEmails.includes(member.userEmail) &&
      !groupMemberIds.includes(member.userId)
  );

  // Filter available members based on search
  const filteredAvailableMembers = availableMembers.filter((member) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.userName?.toLowerCase().includes(query) ||
      member.userEmail?.toLowerCase().includes(query)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Don't close if clicking inside the dropdown or the row button
      if (
        dropdownRef.current &&
        dropdownRef.current.contains(target)
      ) {
        return;
      }
      
      if (
        rowRef.current &&
        rowRef.current.contains(target) &&
        !(target as Element).closest('button[aria-label="Manage group members"]')
      ) {
        return;
      }

      // Close only if clicking truly outside
      setIsDropdownOpen(false);
      setShowAddInput(false);
      setSearchQuery("");
    };

    // Use a small delay to avoid closing immediately when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isDropdownOpen]);

  // Close more options when clicking outside
  useEffect(() => {
    if (!isOptionsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (optionsRef.current && optionsRef.current.contains(target)) return;
      if (moreBtnRef.current && moreBtnRef.current.contains(target)) return;
      setIsOptionsOpen(false);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOptionsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [isOptionsOpen]);

  // Position the more options menu
  const openOptions = () => {
    if (moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect();
      setOptionsPosition({ top: rect.bottom + 6, left: rect.right - 180, width: 180 });
      setIsOptionsOpen(true);
    }
  };

  const handleRenameFromMenu = () => {
    setIsOptionsOpen(false);
    // Ensure member dropdown is closed to avoid focus conflicts
    setIsDropdownOpen(false);
    onStartEdit();
  };

  const handleCreateWorkArea = () => {
    // Placeholder action; integrate actual flow later
    setIsOptionsOpen(false);
    console.log("Create work area from group: ", group.id);
  };

  const handleDeleteGroupClick = () => {
    setIsOptionsOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  // Focus input when add input is shown
  useEffect(() => {
    if (showAddInput && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddInput]);

  const handleRemoveMember = async (memberEmail: string) => {
    try {
      const updatedMembers = group.members?.filter(
        (m) => m.userEmail !== memberEmail
      ) || [];

      // Get group ID - handle both id and _id
      const groupId = group.id;

      if (!groupId) {
        console.error("Group ID is missing", group);
        return;
      }

      await updateWorkspaceGroup(groupId, group.name, updatedMembers);
    } catch (error) {
      console.error("Error removing member from group:", error);
    }
  };

  const handleAddMember = async (member: Members) => {
    try {
      // Check if member is already in the group
      const isAlreadyMember = group.members?.some(
        (m) => m.userEmail === member.userEmail || m.userId === member.userId
      );

      if (isAlreadyMember) {
        console.warn("Member is already in the group");
        return;
      }

      const updatedMembers = [...(group.members || []), member];
      
      // Get group ID - handle both id and _id
      const groupId = group.id;
      
      if (!groupId) {
        console.error("Group ID is missing", group);
        return;
      }

      console.log("Adding member to group:", { groupId, member, updatedMembers });
      await updateWorkspaceGroup(groupId, group.name, updatedMembers);
      setShowAddInput(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Error adding member to group:", error);
    }
  };

  const memberCount = membersInGroup.length;

  // Calculate dropdown position
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (isDropdownOpen && rowRef.current) {
      const updatePosition = () => {
        const rect = rowRef.current?.getBoundingClientRect();
        if (rect) {
          setDropdownPosition({
            top: rect.bottom,
            left: rect.left,
            width: rect.width,
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
  }, [isDropdownOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onSaveEdit(trimmedName);
    } else {
      handleCancel();
    }
  };

  const handleCancel = () => {
    setName(group.name);
    onCancelEdit();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Don't save if clicking on dropdown or other interactive elements
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && (
      relatedTarget.closest('.group-member-dropdown') ||
      relatedTarget.closest('button') ||
      relatedTarget.closest('[role="button"]')
    )) {
      return;
    }
    handleSave();
  };

  return (
    <div ref={rowRef} className="relative flex h-full items-stretch shadow-[inset_0_-1px_0_var(--c-tabDivCol)]">
      {/* Dropdown button at the beginning */}
      <div className="w-[50px] min-w-[50px] px-3 flex items-center">
        <div className="min-w-[50px]">
          <button
            role="button"
            tabIndex={0}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="user-select-none transition-colors duration-200 ease-in cursor-pointer opacity-100 inline-flex items-center justify-center h-7 w-7 rounded-md text-sm flex-shrink-0 leading-[1.2] text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Manage group members"
          >
            <ChevronDown
              className={cn(
                "w-4 h-4 block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0 transition-transform",
                isDropdownOpen && "transform rotate-180"
              )}
            />
          </button>
        </div>
      </div>

      {/* Group name */}
      <div className="w-[35%] min-w-[250px] px-3 flex items-center">
        <div className="min-w-[250px]">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="w-full text-sm font-medium text-zinc-900 dark:text-zinc-100 bg-transparent border-b-2 border-blue-500 dark:border-blue-400 outline-none px-1"
            />
          ) : (
            <div
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              {group.name}
            </div>
          )}
        </div>
      </div>

      {/* Members count */}
      <div className="w-[20%] min-w-[120px] px-3 flex items-center">
        <div className="min-w-[120px]">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            {group.members?.length || 0} {group.members?.length === 1 ? "member" : "members"}
          </div>
        </div>
      </div>

      {/* Created date */}
      <div className="w-[25%] min-w-[150px] px-3 flex items-center">
        <div className="min-w-[150px]">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            {group.createdAt ? new Date(group.createdAt).toLocaleDateString() : "—"}
          </div>
        </div>
      </div>

      {/* Actions - More options (3-dot menu) */}
      <div className="w-[10%] min-w-[50px] px-3 flex items-center">
        <div className="min-w-[50px] relative">
          <div className="w-full flex justify-end opacity-100 relative">
            <button
              role="button"
              tabIndex={0}
            ref={moreBtnRef}
            onClick={(e) => {
              e.stopPropagation();
              openOptions();
            }}
            className="user-select-none transition-colors duration-200 ease-in cursor-pointer flex items-center h-6 px-0 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 text-zinc-900 dark:text-zinc-100 w-6 justify-center gap-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5 block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0" />
            </button>
          </div>
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
        <DropdownMenu
          items={[
            {
              id: 'rename',
              label: "Rename",
              icon: <DropdownMenuIcons.Rename />,
              onClick: handleRenameFromMenu,
            },
            {
              id: 'create-workarea',
              label: "Create work area",
              icon: <DropdownMenuIcons.CreateWorkArea />,
              onClick: handleCreateWorkArea,
            },
            {
              id: 'delete',
              label: "Delete",
              icon: <DropdownMenuIcons.Delete />,
              variant: 'destructive',
              onClick: handleDeleteGroupClick,
            },
          ]}
          dividerAfter={[1]} // Divider after "Create work area from group"
        />
      </div>,
      document.body
    )}

    {/* Delete confirmation modal */}
    {isDeleteConfirmOpen && typeof window !== "undefined" && createPortal(
      <div
        className="fixed inset-0 z-[11000] flex items-center justify-center"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-black/30" onClick={() => setIsDeleteConfirmOpen(false)} />
        <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 w-[440px] max-w-[90vw] p-4">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Delete group?</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This will remove <span className="font-medium text-zinc-900 dark:text-zinc-100">{group.name}</span> from your workspace. You can't undo this action.
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="px-3 py-1.5 text-sm rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  // Groups are normalized in context, but add fallback for safety
                  const groupId = group.id || (group as any)._id;
                  if (!groupId) {
                    console.error("Group ID is missing", group);
                    return;
                  }
                  await deleteWorkspaceGroup(String(groupId));
                } catch (err) {
                  console.error("Failed to delete group", err);
                } finally {
                  setIsDeleteConfirmOpen(false);
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

      {/* Full-width dropdown below the row - rendered via portal */}
      {isDropdownOpen && typeof window !== "undefined" && createPortal(
        <div 
          ref={dropdownRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed z-[9999] bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 max-h-[450px] overflow-hidden flex flex-col"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Group Members
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </div>
          </div>

          {/* Members list */}
          <div className="flex-1 overflow-y-auto py-1">
            {membersInGroup.length === 0 ? (
              <div className="px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                No members in this group
              </div>
            ) : (
              membersInGroup.map((member) => (
                <div
                  key={member.userEmail || member.userId}
                  className="px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {(member.userName || member.userEmail)?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {member.userName || member.userEmail}
                        </div>
                        {member.role && <RoleBadge role={member.role} />}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                        {member.userEmail}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMember(member.userEmail || "");
                    }}
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                    aria-label="Remove member"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add member section */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 p-2">
            {showAddInput ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <input
                    ref={addInputRef}
                    type="text"
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-sm bg-transparent border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>

                {/* Suggestions */}
                {searchQuery && filteredAvailableMembers.length > 0 && (
                  <div className="max-h-[180px] overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md">
                    {filteredAvailableMembers.map((member) => (
                      <button
                        key={member.userEmail || member.userId}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddMember(member);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3"
                      >
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {(member.userName || member.userEmail)?.charAt(0).toUpperCase() || "U"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {member.userName || member.userEmail}
                            </div>
                            {member.role && <RoleBadge role={member.role} />}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                            {member.userEmail}
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-zinc-500 dark:text-zinc-400 ml-2 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery && filteredAvailableMembers.length === 0 && (
                  <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                    No members found
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddInput(false);
                      setSearchQuery("");
                    }}
                    className="flex-1 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddInput(true);
                }}
                className="w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add member
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

interface RoleBadgeProps {
  role: string;
}

function RoleBadge({ role }: RoleBadgeProps) {
  const roleConfig = {
    owner: {
      label: "Owner",
      className: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    },
    admin: {
      label: "Admin",
      className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    },
    member: {
      label: "Member",
      className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
    },
  };

  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.member;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

