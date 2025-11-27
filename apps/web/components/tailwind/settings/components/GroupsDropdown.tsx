"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { cn } from "@/lib/utils";
import { DropdownMenu } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

interface GroupsDropdownProps {
  memberEmail: string;
  memberId: string;
}

export default function GroupsDropdown({
  memberEmail,
  memberId,
}: GroupsDropdownProps) {
  const { currentWorkspace } = useWorkspaceContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Get groups that contain this member
  const workspaceGroups = (currentWorkspace as any)?.groups || [];
  const memberGroups = workspaceGroups.filter((group: any) =>
    group.members?.some(
      (m: any) => m.userEmail === memberEmail || m.userId === memberId
    )
  );

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
          setDropdownPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: Math.max(200, rect.width),
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
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [isOpen]);

  // Build menu items from groups (no icons, just titles)
  const menuItems: DropdownMenuItemProps[] = useMemo(() => {
    return memberGroups.map((group) => ({
      id: group._id?.toString() || group.id || group.name,
      label: group.name || "Unnamed Group",
      onClick: () => {
        // You can add click handler here if needed
        setIsOpen(false);
      },
    }));
  }, [memberGroups]);

  if (memberGroups.length === 0) {
    return (
      <div className="text-xs text-zinc-500 dark:text-zinc-400">No groups</div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="user-select-none transition-colors duration-200 ease-in cursor-pointer opacity-100 inline-flex items-center h-7 px-2 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <span className="text-xs">
          {memberGroups.length} {memberGroups.length === 1 ? "group" : "groups"}
        </span>
        <ChevronDown
          className={cn(
            "w-2.5 h-full block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0 ml-1 transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </button>
      {isOpen && typeof window !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed z-[10000] bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-700 min-w-[200px] max-w-[300px] max-h-[200px] overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          <DropdownMenu items={menuItems} />
        </div>,
        document.body
      )}
    </div>
  );
}
