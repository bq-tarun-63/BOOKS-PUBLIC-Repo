"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, CheckCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import DeleteConfirmationModal from "@/components/tailwind/ui/deleteConfirmationModal";
import type { WorkArea } from "@/types/workarea";
import type { Members } from "@/types/workspace";
import { DropdownMenu } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

interface GeneralTabProps {
  workArea: WorkArea;
  ownerMember?: Members;
  isOwner: boolean;
  onAccessLevelChange: (newAccessLevel: "open" | "closed" | "private") => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function GeneralTab({
  workArea,
  ownerMember,
  isOwner,
  onAccessLevelChange,
  onDelete,
}: GeneralTabProps) {
  const { user } = useAuth();
  const [isAccessDropdownOpen, setIsAccessDropdownOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const accessButtonRef = useRef<HTMLButtonElement>(null);
  const accessDropdownRef = useRef<HTMLDivElement>(null);

  // Get access level display
  const accessDisplay =
    workArea.accessLevel === "open"
      ? "Open"
      : workArea.accessLevel === "closed"
        ? "Closed"
        : "Private";

  // Format dates
  const createdAt = workArea.createdAt
    ? new Date(workArea.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const updatedAt = workArea.updatedAt
    ? new Date(workArea.updatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

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

  const handleAccessChange = async (newAccessLevel: "open" | "closed" | "private") => {
    if (!isOwner) return;
    try {
      await onAccessLevelChange(newAccessLevel);
      setIsAccessDropdownOpen(false);
      toast.success("Access level updated successfully");
    } catch (err) {
      console.error("Failed to update access level", err);
      toast.error("Failed to update access level");
    }
  };

  // Build access menu items
  const accessMenuItems: DropdownMenuItemProps[] = useMemo(() => [
    {
      id: 'open',
      label: "Open",
      onClick: () => handleAccessChange("open"),
      selected: workArea.accessLevel === "open",
      rightElement: workArea.accessLevel === "open" ? <CheckCircle className="w-4 h-4" /> : undefined,
    },
    {
      id: 'closed',
      label: "Closed",
      onClick: () => handleAccessChange("closed"),
      selected: workArea.accessLevel === "closed",
      rightElement: workArea.accessLevel === "closed" ? <CheckCircle className="w-4 h-4" /> : undefined,
    },
    {
      id: 'private',
      label: "Private",
      onClick: () => handleAccessChange("private"),
      selected: workArea.accessLevel === "private",
      rightElement: workArea.accessLevel === "private" ? <CheckCircle className="w-4 h-4" /> : undefined,
    },
  ], [workArea.accessLevel, handleAccessChange]);

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      toast.success("Work area deleted successfully");
    } catch (err) {
      console.error("Failed to delete work area", err);
      toast.error("Failed to delete work area");
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  return (
    <>
      <div className="px-9 pb-5 space-y-6">
        {/* Access Level */}
        <div>
          <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            Access Level
          </label>
          {isOwner ? (
            <div className="relative">
              <button
                ref={accessButtonRef}
                onClick={() => setIsAccessDropdownOpen(!isAccessDropdownOpen)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-colors",
                  isAccessDropdownOpen
                    ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                    : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                )}
              >
                <span>{accessDisplay}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">{accessDisplay}</div>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            {workArea.accessLevel === "open" &&
              "Anyone in the work area can join this work area."}
            {workArea.accessLevel === "closed" &&
              "Members need approval to join this work area."}
            {workArea.accessLevel === "private" &&
              "Only invited members can access this work area."}
          </p>
        </div>

      {/* Work Area Owner */}
      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          Work Area Owner
        </label>
        {ownerMember ? (
          <div className="flex items-center gap-2">
            <div className="bg-zinc-200 dark:bg-zinc-700 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {ownerMember.userName?.charAt(0).toUpperCase() ||
                  ownerMember.userEmail?.charAt(0).toUpperCase() ||
                  "U"}
              </span>
            </div>
            <div className="text-sm text-zinc-900 dark:text-zinc-100">
              {ownerMember.userName || ownerMember.userEmail}
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Owner not found (ID: {workArea.ownerId})
          </div>
        )}
      </div>

      {/* Created Date */}
      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          Created
        </label>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{createdAt}</div>
      </div>

        {/* Updated Date */}
        <div>
          <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            Last Updated
          </label>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">{updatedAt}</div>
        </div>

        {/* Delete Button - Owner Only */}
        {isOwner && (
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <button
              onClick={handleDeleteClick}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete work area
            </button>
          </div>
        )}
      </div>

      {/* Access Level Dropdown */}
      {isAccessDropdownOpen && isOwner && typeof window !== "undefined" && createPortal(
        <div
          ref={accessDropdownRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed z-[12000] bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 rounded-md min-w-[160px]"
          style={{
            top: accessButtonRef.current
              ? accessButtonRef.current.getBoundingClientRect().bottom + 4
              : 0,
            left: accessButtonRef.current
              ? accessButtonRef.current.getBoundingClientRect().left
              : 0,
          }}
        >
          <DropdownMenu items={accessMenuItems} />
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && typeof window !== "undefined" && createPortal(
        <DeleteConfirmationModal
        header="Delete Work Area"
          title="Delete work area?"
          message={`This will remove ${workArea.name} from your work area. You can't undo this action.`}
          isOpen={isDeleteConfirmOpen}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setIsDeleteConfirmOpen(false);
            }
          }}
          onConfirm={handleConfirmDelete}
        />,
        document.body
      )}
    </>
  );
}

