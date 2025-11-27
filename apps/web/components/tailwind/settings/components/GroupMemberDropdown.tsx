"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Plus, Search } from "lucide-react";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import type { Members, WorkspaceGroup } from "@/types/workspace";
import { cn } from "@/lib/utils";

interface GroupMemberDropdownProps {
  group: WorkspaceGroup;
}

export default function GroupMemberDropdown({ group }: GroupMemberDropdownProps) {
  const {
    workspaceMembers,
    updateWorkspaceGroup,
  } = useWorkspaceContext();

  const [isOpen, setIsOpen] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowAddInput(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Focus input when add input is shown
  useEffect(() => {
    if (showAddInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAddInput]);

  const handleRemoveMember = async (memberEmail: string) => {
    const updatedMembers = group.members?.filter(
      (m) => m.userEmail !== memberEmail
    ) || [];

    if (group.id) {
      await updateWorkspaceGroup(String(group.id), undefined, updatedMembers);
    }
  };

  const handleAddMember = async (member: Members) => {
    const updatedMembers = [...(group.members || []), member];

    if (group.id) {
      await updateWorkspaceGroup(String(group.id), undefined, updatedMembers);
      setShowAddInput(false);
      setSearchQuery("");
    }
  };

  const handleAddButtonClick = () => {
    setShowAddInput(true);
  };

  const memberCount = membersInGroup.length;

  return (
    <div className="relative group-member-dropdown" ref={dropdownRef}>
      <button
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        className="user-select-none transition-colors duration-200 ease-in cursor-pointer opacity-100 inline-flex items-center justify-center h-7 w-7 rounded-md text-sm flex-shrink-0 leading-[1.2] text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label="Manage group members"
      >
        <ChevronDown
          className={cn(
            "w-4 h-4 block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0 transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-700 min-w-[300px] max-w-[350px] max-h-[450px] overflow-hidden flex flex-col">
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
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {member.userName || member.userEmail}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                        {member.userEmail}
                      </div>
                      {member.role && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                          {member.role}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.userEmail || "")}
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                    aria-label="Remove member"
                  >
                    <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
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
                    ref={inputRef}
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
                        onClick={() => handleAddMember(member)}
                        className="w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3"
                      >
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {(member.userName || member.userEmail)?.charAt(0).toUpperCase() || "U"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {member.userName || member.userEmail}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                            {member.userEmail}
                          </div>
                          {member.role && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                              {member.role}
                            </div>
                          )}
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
                    onClick={() => {
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
                onClick={handleAddButtonClick}
                className="w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add member
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

