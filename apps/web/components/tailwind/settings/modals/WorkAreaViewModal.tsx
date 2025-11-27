"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { useWorkAreaContext } from "@/contexts/workAreaContext";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { WorkArea } from "@/types/workarea";
import GeneralTab from "./WorkAreaViewModal/GeneralTab";
import MembersTab from "./WorkAreaViewModal/MembersTab";

interface WorkAreaViewModalProps {
  workArea: WorkArea;
  isOpen: boolean;
  onClose: () => void;
  onMembersUpdated?: () => void;
  onWorkAreaDeleted?: () => void;
}

type TabType = "general" | "members";

export default function WorkAreaViewModal({
  workArea,
  isOpen,
  onClose,
  onMembersUpdated,
  onWorkAreaDeleted,
}: WorkAreaViewModalProps) {
  const { workspaceMembers } = useWorkspaceContext();
  const { updateWorkspaceWorkArea, deleteWorkspaceWorkArea, workAreas } = useWorkAreaContext();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Keep local state of workArea to prevent modal from closing on updates
  const [currentWorkArea, setCurrentWorkArea] = useState(workArea);
  
  // Update local workArea when prop changes or when workAreas context updates
  useEffect(() => {
    if (isOpen) {
      const updatedWorkArea = workAreas.find(wa => wa._id === workArea._id || String(wa._id) === String(workArea._id));
      if (updatedWorkArea) {
        setCurrentWorkArea(updatedWorkArea);
      } else {
        setCurrentWorkArea(workArea);
      }
    }
  }, [workArea, workAreas, isOpen]);

  // Check if current user is a member
  const isMember = currentWorkArea.members?.some(
    (m) => m.userEmail === user?.email
  ) || false;

  // Get WORK AREA owner (not workspace owner)
  // Work area owner is determined by workArea.ownerId, which is separate from workspace ownership
  // First, try to find work area owner in workspace members by matching ownerId
  const workAreaOwnerMember = workspaceMembers.find(
    (m) => String(m.userId) === String(currentWorkArea.ownerId) || m.userId === currentWorkArea.ownerId
  );

  // If not found in workspace members, try to find in workArea members array
  // This handles edge cases where owner might not be in workspace members anymore
  const workAreaOwnerFromMembers = currentWorkArea.members?.find(
    (m) => String(m.userId) === String(currentWorkArea.ownerId) || m.userId === currentWorkArea.ownerId
  );

  // Use workAreaOwnerMember from workspace, or fallback to finding by email from members array
  // Owner can be undefined/null in edge cases (e.g., owner removed from workspace but still owns workArea)
  const finalWorkAreaOwnerMember = workAreaOwnerMember || (workAreaOwnerFromMembers ? workspaceMembers.find(
    (m) => m.userEmail === workAreaOwnerFromMembers.userEmail || String(m.userId) === String(workAreaOwnerFromMembers.userId)
  ) : null);

  // Check if current user is the WORK AREA owner (not workspace owner)
  // Compare by email since user object doesn't have id field
  const workAreaOwnerEmail = finalWorkAreaOwnerMember?.userEmail || workAreaOwnerFromMembers?.userEmail;
  const isWorkAreaOwner: boolean = !!(user?.email && workAreaOwnerEmail === user.email);

  // Get member count
  const memberCount = currentWorkArea.members?.length || 0;

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
        className="relative bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-700 w-[630px] h-[640px] max-w-[calc(100vw-100px)] max-h-[calc(100vh-100px)] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="px-9 pt-[34px] pb-5 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-start gap-3">
            {/* Work Area Icon */}
            <div className="flex-shrink-0">
              {currentWorkArea.icon ? (
                <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full shadow-none outline outline-1 outline-offset-[-1px] outline-zinc-300 dark:outline-zinc-600">
                  <div className="box-content rounded-full leading-12 w-12 h-12 overflow-hidden text-center bg-zinc-100 dark:bg-zinc-800 select-none opacity-100 flex items-center justify-center">
                    <span className="text-2xl leading-none">{currentWorkArea.icon}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full shadow-none outline outline-1 outline-offset-[-1px] outline-zinc-300 dark:outline-zinc-600">
                  <div className="box-content rounded-full leading-12 w-12 h-12 overflow-hidden text-center text-lg bg-zinc-100 dark:bg-zinc-800 select-none text-zinc-600 dark:text-zinc-400 opacity-100 flex items-center justify-center">
                    {currentWorkArea.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>

            {/* Work Area Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {currentWorkArea.name}
                </h2>
                {isMember && (
                  <div className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700">
                    <svg
                      aria-hidden="true"
                      role="graphics-symbol"
                      viewBox="0 0 16 16"
                      className="w-4 h-4"
                      style={{ fill: "inherit", flexShrink: 0, marginRight: "2px" }}
                    >
                      <path d="M11.62 3.18a.876.876 0 0 1 1.5.9l-5.244 8.74a.876.876 0 0 1-1.414.12L2.966 8.86a.875.875 0 1 1 1.328-1.138L7 10.879z"></path>
                    </svg>
                    Joined
                  </div>
                )}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 px-9 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 overflow-x-auto">
          <button
            role="tab"
            tabIndex={activeTab === "general" ? 0 : -1}
            aria-selected={activeTab === "general"}
            onClick={() => setActiveTab("general")}
            className={cn(
              "px-2 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap relative",
              activeTab === "general"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            General
            {activeTab === "general" && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-zinc-900 dark:bg-zinc-100" />
            )}
          </button>
          <button
            role="tab"
            tabIndex={activeTab === "members" ? 0 : -1}
            aria-selected={activeTab === "members"}
            onClick={() => setActiveTab("members")}
            className={cn(
              "px-2 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap relative",
              activeTab === "members"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            Members
            {activeTab === "members" && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-zinc-900 dark:bg-zinc-100" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pt-5">
          {activeTab === "general" && (
            <GeneralTab
              workArea={currentWorkArea}
              ownerMember={finalWorkAreaOwnerMember || undefined}
              isOwner={isWorkAreaOwner}
              onAccessLevelChange={async (newAccessLevel) => {
                await updateWorkspaceWorkArea(currentWorkArea._id, undefined, undefined, undefined, newAccessLevel);
                // Refresh work area data but keep modal open
                const updatedWorkArea = workAreas.find(wa => wa._id === currentWorkArea._id || String(wa._id) === String(currentWorkArea._id));
                if (updatedWorkArea) {
                  setCurrentWorkArea(updatedWorkArea);
                }
              }}
              onDelete={async () => {
                await deleteWorkspaceWorkArea(currentWorkArea._id);
                onClose();
                onWorkAreaDeleted?.();
              }}
            />
          )}
          {activeTab === "members" && (
            <MembersTab
              workArea={currentWorkArea}
              workspaceMembers={workspaceMembers}
              isOwner={isWorkAreaOwner}
              onMembersUpdated={() => {
                // Refresh work area data but keep modal open
                const updatedWorkArea = workAreas.find(wa => wa._id === currentWorkArea._id || String(wa._id) === String(currentWorkArea._id));
                if (updatedWorkArea) {
                  setCurrentWorkArea(updatedWorkArea);
                }
                onMembersUpdated?.();
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

