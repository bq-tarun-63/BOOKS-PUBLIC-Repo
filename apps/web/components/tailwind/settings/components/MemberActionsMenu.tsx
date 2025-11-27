"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { postWithAuth, deleteWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";
import type { Members } from "@/types/workspace";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { DropdownMenu, DropdownMenuIcons } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

interface MemberActionsMenuProps {
  member: Members;
  workspaceId: string;
  isCurrentUser?: boolean;
  currentUserRole?: "owner" | "admin" | "member" | null;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
  // onMemberUpdated: () => void;
}

export default function MemberActionsMenu({
  member,
  workspaceId,
  isCurrentUser = false,
  currentUserRole = null,
  buttonRef,
  onClose,
  // onMemberUpdated,
}: MemberActionsMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentWorkspace, currentWorkspace } = useWorkspaceContext();
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate position relative to button
  useEffect(() => {
    if (!buttonRef?.current || !menuRef.current) return;

    const updatePosition = () => {
      if (!buttonRef?.current || !menuRef.current) return;
      
      const buttonRect = buttonRef.current.getBoundingClientRect();
      
      // Position menu below and align to right edge of button
      menuRef.current.style.top = `${buttonRect.bottom + 4}px`;
      menuRef.current.style.right = `${window.innerWidth - buttonRect.right}px`;
    };

    // Update position after render
    const timeoutId = setTimeout(updatePosition, 0);
    
    // Update on scroll/resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [buttonRef]);

  const handleUpdateRole = async (newRole: "admin" | "member") => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await postWithAuth(
        "/api/workSpace/settings/people/updateRole",
        {
          workspaceId,
          memberId: member.userId,
          role: newRole,
        }
      );

      if (response && !(response as { isError?: boolean }).isError) {
        // Update local workspace state
        if (currentWorkspace) {
          const updatedMembers = currentWorkspace.members.map((m) =>
            m.userId === member.userId ? { ...m, role: newRole } : m
          );
          setCurrentWorkspace({
            ...currentWorkspace,
            members: updatedMembers,
          });
        }

        toast.success(
          `${member.userName || member.userEmail} is now ${newRole}`
        );
        // onMemberUpdated();
        onClose();
      } else {
        throw new Error("Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update member role");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (isLoading) return;
    if (
      !confirm(
        `Are you sure you want to remove ${member.userName || member.userEmail} from this workspace?`
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await postWithAuth(
        "/api/workSpace/settings/people/remove",
        {
          workspaceId,
          memberId: member.userId,
        }
      );

      if (response && !(response as { isError?: boolean }).isError) {
        // Update local workspace state
        if (currentWorkspace) {
          const updatedMembers = currentWorkspace.members.filter(
            (m) => m.userId !== member.userId
          );
          setCurrentWorkspace({
            ...currentWorkspace,
            members: updatedMembers,
          });
        }

        toast.success(
          `${member.userName || member.userEmail} has been removed`
        );
        // onMemberUpdated();
        onClose();
      } else {
        throw new Error("Failed to remove member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setIsLoading(false);
    }
  };

  // Build menu items array based on conditions
  const menuItems: DropdownMenuItemProps[] = useMemo(() => {
    const items: DropdownMenuItemProps[] = [];

    // Don't allow changing own role or removing yourself
    if (!isCurrentUser) {
      // Role change options - text changes based on current role
      if (member.role === "member") {
        items.push({
          id: 'make-admin',
          label: "Make admin",
          icon: <DropdownMenuIcons.MakeAdmin />,
          onClick: () => handleUpdateRole("admin"),
          disabled: isLoading,
        });
      }

      // Owner and admin can make admin as normal member
      if (member.role === "admin") {
        items.push({
          id: 'make-member',
          label: "Make member",
          icon: <DropdownMenuIcons.MakeMember />,
          onClick: () => handleUpdateRole("member"),
          disabled: isLoading,
        });
      }

      // Remove option - admin cannot remove owner
      const isOwnerMember = member.role === "owner";
      const isAdminUser = currentUserRole === "admin";
      
      if (!(isAdminUser && isOwnerMember)) {
        // Only show remove if: (not admin) OR (admin but not removing owner)
        items.push({
          id: 'remove',
          label: "Remove",
          icon: <DropdownMenuIcons.Delete />,
          variant: 'destructive',
          onClick: handleRemoveMember,
          disabled: isLoading,
        });
      }
    } else {
      // If it's the current user, show a message or disable actions
      items.push({
        id: 'cannot-modify',
        label: "You cannot modify your own role",
        icon: <DropdownMenuIcons.MakeAdmin />,
        onClick: () => {},
        disabled: true,
      });
    }

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentUser, member.role, currentUserRole, isLoading, member.userId, workspaceId]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[99999]"
        data-member-actions-backdrop="true"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      />
      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-[100000] bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-700 min-w-[180px] member-actions-menu"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DropdownMenu items={menuItems} />
      </div>
    </>
  );
}
