"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Members } from "@/types/workspace";
import MemberActionsMenu from "./MemberActionsMenu";
import GroupsDropdown from "./GroupsDropdown";

interface MemberRowProps {
  member: Members;
  currentUserEmail: string | null;
  currentUserRole: "owner" | "admin" | "member" | null;
  workspaceId: string;
  // onMemberUpdated: () => void;
}

export default function MemberRow({
  member,
  currentUserEmail,
  currentUserRole,
  workspaceId,
  // onMemberUpdated,
}: MemberRowProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showActionsMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the button and the menu
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        !(target as Element).closest('.member-actions-menu')
      ) {
        setShowActionsMenu(false);
      }
    };

    // Use a small delay to avoid closing immediately when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [showActionsMenu]);

  // Check if current user can manage members (owner or admin)
  const canManageMembers =
    currentUserRole === "owner" || currentUserRole === "admin";
  
  // Check if this is the current user's row
  const isCurrentUser = member.userEmail === currentUserEmail;
  
  // Show menu for all members if user is admin/owner (but disable certain actions for current user)
  const shouldShowMenu = canManageMembers;
  
  // Debug logging (remove in production)
  if (process.env.NODE_ENV === "development") {
    console.log("MemberRow Debug:", {
      memberEmail: member.userEmail,
      currentUserEmail,
      currentUserRole,
      canManageMembers,
      isCurrentUser,
      shouldShowMenu,
    });
  }

  return (
    <div className="flex h-full items-stretch shadow-[inset_0_-1px_0_var(--c-tabDivCol)]">
      {/* User info */}
      <div className="w-[35%] min-w-[250px] px-3 flex items-center">
        <div className="min-w-[250px]">
          <div className="flex items-center text-sm w-full justify-between">
            <div className="flex items-center gap-2.5 mt-1 mb-1">
              <div className="relative">
                <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full shadow-none outline outline-1 outline-offset-[-1px] outline-zinc-300 dark:outline-zinc-600">
                  <div className="box-content rounded-full leading-7 w-7 h-7 overflow-hidden text-center text-xs bg-zinc-100 dark:bg-zinc-800 select-none text-zinc-600 dark:text-zinc-400 opacity-100">
                    <div>
                      {member.userName?.charAt(0).toUpperCase() ||
                        member.userEmail?.charAt(0).toUpperCase() ||
                        "U"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="max-w-[163px]">
                <div
                  title={member.userName || member.userEmail}
                  className="h-[17px] self-stretch text-sm font-medium leading-[18px] whitespace-nowrap overflow-hidden text-ellipsis text-zinc-900 dark:text-zinc-100"
                >
                  {member.userName || member.userEmail}
                </div>
                <div
                  title={member.userEmail}
                  className="h-[17px] self-stretch text-xs font-normal leading-[15px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {member.userEmail}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role */}
      <div className="w-[20%] min-w-[120px] px-3 flex items-center">
        <div className="min-w-[120px]">
          <RoleBadge role={member.role} />
        </div>
      </div>

      {/* Groups */}
      <div className="w-[25%] min-w-[150px] px-3 flex items-center">
        <div className="min-w-[150px]">
          <GroupsDropdown
            memberEmail={member.userEmail}
            memberId={member.userId}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="w-[10%] min-w-[50px] px-3 flex items-center">
        <div className="min-w-[50px] relative" ref={actionsMenuRef}>
          {shouldShowMenu && (
            <div className="w-full flex justify-end opacity-100 relative">
              <button
                ref={buttonRef}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActionsMenu(!showActionsMenu);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="user-select-none transition-colors duration-200 ease-in cursor-pointer flex items-center h-6 px-0 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 text-zinc-900 dark:text-zinc-100 w-6 justify-center gap-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <MoreVertical className="w-5 h-5 block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0" />
              </button>
              {showActionsMenu &&
                typeof window !== "undefined" &&
                createPortal(
                  <MemberActionsMenu
                    member={member}
                    workspaceId={workspaceId}
                    isCurrentUser={isCurrentUser}
                    currentUserRole={currentUserRole}
                    buttonRef={buttonRef}
                    onClose={() => setShowActionsMenu(false)}
                    // onMemberUpdated={onMemberUpdated}
                  />,
                  document.body
                )}
            </div>
          )}
        </div>
      </div>
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
