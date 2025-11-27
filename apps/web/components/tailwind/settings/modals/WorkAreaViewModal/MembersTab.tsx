"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { postWithAuth } from "@/lib/api-helpers";
import type { WorkArea } from "@/types/workarea";
import type { Members } from "@/types/workspace";
import WorkAreaAddMembersModal from "../WorkAreaAddMembersModal";

interface MembersTabProps {
  workArea: WorkArea;
  workspaceMembers: Members[];
  isOwner: boolean;
  onMembersUpdated?: () => void;
}

export default function MembersTab({
  workArea,
  workspaceMembers,
  isOwner,
  onMembersUpdated,
}: MembersTabProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "role">("role");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Get work area members with full member details
  // Preserve workArea member's role (don't override with workspace member's role)
  const workAreaMembersWithDetails = (workArea.members || []).map((waMember) => {
    const fullMember = workspaceMembers.find(
      (m) =>
        m.userEmail === waMember.userEmail ||
        m.userId === String(waMember.userId)
    );
    return {
      ...fullMember, // Get workspace member details (userName, etc.)
      ...waMember,   // Override with workArea member data (preserves workArea role)
      // Check if this member is the workArea owner by comparing with ownerId
      isWorkAreaOwner: String(waMember.userId) === String(workArea.ownerId) || 
                      waMember.userId === workArea.ownerId,
    };
  });

  // Filter and sort members
  const filteredAndSortedMembers = workAreaMembersWithDetails
    .filter((member) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        member.userName?.toLowerCase().includes(query) ||
        member.userEmail?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === "role") {
        // WorkArea owner first, then members
        if (a.isWorkAreaOwner && !b.isWorkAreaOwner) return -1;
        if (!a.isWorkAreaOwner && b.isWorkAreaOwner) return 1;
        // Then sort by name
        const nameA = a.userName || a.userEmail || "";
        const nameB = b.userName || b.userEmail || "";
        return nameA.localeCompare(nameB);
      } else {
        // Sort by name
        const nameA = a.userName || a.userEmail || "";
        const nameB = b.userName || b.userEmail || "";
        return nameA.localeCompare(nameB);
      }
    });

  const handleAddMembersClick = () => {
    setShowAddMembersModal(true);
  };

  const handleMembersAdded = () => {
    setShowAddMembersModal(false);
    onMembersUpdated?.();
  };

  const getRoleDisplay = (role: string) => {
    if (role === "owner") return "Work area owner";
    return "Work area member";
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (openDropdownId === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const dropdown = dropdownRefs.current[openDropdownId];
      const button = buttonRefs.current[openDropdownId];
      
      if (dropdown && dropdown.contains(target)) return;
      if (button && button.contains(target)) return;
      setOpenDropdownId(null);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdownId(null);
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [openDropdownId]);

  const handleRemoveMember = async (member: any) => {
    if (!isOwner) return;
    if (member.isWorkAreaOwner) {
      toast.error("Cannot remove the work area owner");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to remove ${member.userName || member.userEmail} from this work area?`
      )
    ) {
      return;
    }

    setRemovingMemberId(member.userId || member.userEmail);
    setOpenDropdownId(null);
    try {
      const response = await postWithAuth("/api/workarea/removeMember", {
        workAreaId: workArea._id,
        memberId: member.userId || member.userEmail,
      });

      if (response && !(response as { isError?: boolean }).isError) {
        toast.success(
          `${member.userName || member.userEmail} has been removed from the work area`
        );
        onMembersUpdated?.();
      } else {
        throw new Error("Failed to remove member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getMemberId = (member: any) => {
    return member.userId || member.userEmail || String(member);
  };

  return (
    <>
      <div className="px-9 pb-5 space-y-5">
        {/* Search and Add Members */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <input
              type="text"
              placeholder="Search members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-2.5 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAddMembersClick}
            disabled={!isOwner}
            className={cn(
              "inline-flex items-center justify-center h-8 px-3 rounded-md text-sm font-medium transition-colors",
              isOwner
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed opacity-60"
            )}
          >
            Add members
          </button>
        </div>

        {/* Members List Header */}
        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-2">
            <button
              onClick={() => setSortBy("name")}
              className={cn(
                "px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                sortBy === "name" && "font-medium"
              )}
            >
              Name
            </button>
            <button
              onClick={() => setSortBy("role")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                sortBy === "role" && "font-medium"
              )}
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Role
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-0">
          {filteredAndSortedMembers.length === 0 ? (
            <div className="text-center py-8 text-sm text-zinc-500 dark:text-zinc-400">
              {searchQuery ? "No members found" : "No members"}
            </div>
          ) : (
            filteredAndSortedMembers.map((member, index) => {
              const isCurrentUser = member.userEmail === user?.email;
              const displayName = member.userName || member.userEmail || "Unknown";
              const initials =
                member.userName?.charAt(0).toUpperCase() ||
                member.userEmail?.charAt(0).toUpperCase() ||
                "U";

              return (
                <div key={member.userEmail || member.userId || index}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full w-8 h-8 flex items-center justify-center">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {initials}
                          </span>
                        </div>
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {displayName}
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">
                              (You)
                            </span>
                          )}
                          {member.isWorkAreaOwner && (
                            <span className="px-1 py-0.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700 rounded">
                              Work area owner
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                          {member.userEmail}
                        </div>
                      </div>
                    </div>

                    {/* Role Dropdown */}
                    <div className="flex-shrink-0 relative">
                      {member.isWorkAreaOwner ? (
                        <button
                          className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs text-zinc-900 dark:text-zinc-100"
                          disabled
                        >
                          <span>{getRoleDisplay("owner")}</span>
                        </button>
                      ) : (
                        <>
                          <button
                            ref={(el) => {
                              const id = getMemberId(member);
                              buttonRefs.current[id] = el;
                            }}
                            onClick={() => {
                              if (!isOwner) return;
                              const id = getMemberId(member);
                              setOpenDropdownId(openDropdownId === id ? null : id);
                            }}
                            disabled={!isOwner}
                            className={cn(
                              "inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs transition-colors",
                              !isOwner
                                ? "text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60"
                                : openDropdownId === getMemberId(member)
                                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                  : "text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                          >
                            <span>{getRoleDisplay(member.role || "member")}</span>
                            {isOwner && <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          {isOwner && openDropdownId === getMemberId(member) && typeof window !== "undefined" && createPortal(
                            <div
                              ref={(el) => {
                                const id = getMemberId(member);
                                dropdownRefs.current[id] = el;
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="fixed z-[12000] bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 rounded-md py-1 min-w-[160px]"
                              style={{
                                top: buttonRefs.current[getMemberId(member)]
                                  ? buttonRefs.current[getMemberId(member)]!.getBoundingClientRect().bottom + 4
                                  : 0,
                                left: buttonRefs.current[getMemberId(member)]
                                  ? buttonRefs.current[getMemberId(member)]!.getBoundingClientRect().left
                                  : 0,
                              }}
                            >
                              <button
                                onClick={() => handleRemoveMember(member)}
                                disabled={removingMemberId === getMemberId(member)}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                  removingMemberId === getMemberId(member)
                                    ? "text-zinc-400 dark:text-zinc-500"
                                    : "text-red-600 dark:text-red-400"
                                )}
                              >
                                <X className="w-4 h-4" />
                                <span>Remove member</span>
                              </button>
                            </div>,
                            document.body
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {index < filteredAndSortedMembers.length - 1 && (
                    <div className="border-b border-zinc-200 dark:border-zinc-700" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Members Modal */}
      <WorkAreaAddMembersModal
        workArea={workArea}
        isOpen={showAddMembersModal}
        onClose={() => setShowAddMembersModal(false)}
        onMembersAdded={handleMembersAdded}
      />
    </>
  );
}

