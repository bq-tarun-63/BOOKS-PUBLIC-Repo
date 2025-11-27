"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Search, UserPlus, CheckCircle } from "lucide-react";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { useAuth } from "@/hooks/use-auth";
import { postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WorkArea } from "@/types/workarea";
import type { Members } from "@/types/workspace";

interface WorkAreaAddMembersModalProps {
  workArea: WorkArea;
  isOpen: boolean;
  onClose: () => void;
  onMembersAdded?: () => void;
}

export default function WorkAreaAddMembersModal({
  workArea,
  isOpen,
  onClose,
  onMembersAdded,
}: WorkAreaAddMembersModalProps) {
  const { workspaceMembers, currentWorkspace } = useWorkspaceContext();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Members[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Get members not already in the work area
  const workAreaMemberEmails = (workArea.members || []).map((m: any) => (m.userEmail || "").toLowerCase());
  const availableMembers = workspaceMembers.filter(
    (member) => !workAreaMemberEmails.includes(member.userEmail.toLowerCase())
  );

  // Filter available members by search query
  const filteredMembers = availableMembers.filter((member) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.userName?.toLowerCase().includes(query) ||
      member.userEmail?.toLowerCase().includes(query)
    );
  });

  // Close modal on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const toggleMemberSelection = (member: Members) => {
    setSelectedMembers((prev) => {
      const isSelected = prev.some((m) => m.userEmail === member.userEmail);
      if (isSelected) {
        return prev.filter((m) => m.userEmail !== member.userEmail);
      } else {
        return [...prev, member];
      }
    });
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setIsLoading(true);
    try {
      const memberEmails = selectedMembers.map((m) => m.userEmail);
      const workAreaId = workArea._id;

      if (!workAreaId) {
        toast.error("Missing work area ID");
        return;
      }

      // The API will get the current user ID from the session

      const response = await postWithAuth("/api/workarea/addPeople", {
        workAreaId,
        memberEmails,
        role: "member",
      });

      // Check if response is an error
      if (response && typeof response === "object" && "isError" in response && response.isError) {
        const errorResponse = response as { message?: string; error?: string };
        throw new Error(errorResponse.message || errorResponse.error || "Failed to add members");
      }

      // Check if response has an error field (API might return { error: "..." })
      if (response && typeof response === "object" && "error" in response && !("workArea" in response)) {
        const errorResponse = response as { error?: string; message?: string };
        throw new Error(errorResponse.error || errorResponse.message || "Failed to add members");
      }

      toast.success(`Added ${selectedMembers.length} member(s) to work area`);
      setSelectedMembers([]);
      setSearchQuery("");
      onMembersAdded?.();
      onClose();
    } catch (error) {
      console.error("Error adding members to work area:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add members");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Add members to {workArea.name}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Select workspace members to add to this work area
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Selected members */}
        {selectedMembers.length > 0 && (
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              Selected ({selectedMembers.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <div
                  key={member.userEmail}
                  className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-md text-sm"
                >
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {member.userName || member.userEmail}
                  </span>
                  <button
                    onClick={() => toggleMemberSelection(member)}
                    className="hover:bg-blue-200 dark:hover:bg-blue-900/40 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members list */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-sm text-zinc-500 dark:text-zinc-400">
              {searchQuery ? "No members found" : "No available members"}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMembers.map((member) => {
                const isSelected = selectedMembers.some((m) => m.userEmail === member.userEmail);
                return (
                  <button
                    key={member.userEmail}
                    onClick={() => toggleMemberSelection(member)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left",
                      isSelected && "bg-blue-50 dark:bg-blue-900/20"
                    )}
                  >
                    <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {member.userName?.charAt(0).toUpperCase() || member.userEmail.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {member.userName || member.userEmail}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                        {member.userEmail}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={handleAddMembers}
            disabled={selectedMembers.length === 0 || isLoading}
            className={cn(
              "px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Add {selectedMembers.length > 0 ? `${selectedMembers.length} ` : ""}member{selectedMembers.length !== 1 ? "s" : ""}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

