"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useBoard } from "@/contexts/boardContext";
import type { ViewCollection } from "@/types/board";
import { toast } from "sonner";
import { Link as LinkIcon, UserRound, UserCircle2, Lock } from "lucide-react";
import ToggleSetting from "@/components/tailwind/settings/components/ToggleSetting";
import { postWithAuth } from "@/lib/api-helpers";

interface FormShareModalProps {
  readonly board: ViewCollection;
  readonly viewTypeId: string | null;
  readonly onClose: () => void;
}

export default function FormShareModal({ board, viewTypeId, onClose }: FormShareModalProps) {
  const { currentView, boards: contextBoards, updateBoard } = useBoard();
  const latestBoard = contextBoards.find((b) => b._id === board._id) || board;

  const currentViewWithSettings = useMemo(() => {
    const viewData = currentView[board._id];
    if (!viewData) return undefined;

    let view;
    if (viewData.id) {
      view = latestBoard.viewsType?.find((vt) => vt.id === viewData.id);
    } else if (viewData.type) {
      view = latestBoard.viewsType?.find((vt) => vt.viewType === viewData.type);
    }
    return view;
  }, [currentView, board, latestBoard]);

  const [isPublicForm, setIsPublicForm] = useState<boolean>(
    currentViewWithSettings?.isPublicForm ?? false,
  );
  const [anonymousResponses, setAnonymousResponses] = useState<boolean>(
    currentViewWithSettings?.formAnonymousResponses ?? false,
  );
  const [accessToSubmission, setAccessToSubmission] = useState<"no_access" | "can_view_own">(
    currentViewWithSettings?.formAccessToSubmission || "no_access",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  if (!viewTypeId) {
    return null;
  }

  const saveShareState = async (next: {
    isPublicForm?: boolean;
    anonymousResponses?: boolean;
    accessToSubmission?: typeof accessToSubmission;
  }) => {
    try {
      setIsSaving(true);
      const nextState = {
        isPublicForm: next.isPublicForm ?? isPublicForm,
        anonymousResponses: next.anonymousResponses ?? anonymousResponses,
        accessToSubmission: next.accessToSubmission ?? accessToSubmission,
      };
      const res = await postWithAuth("/api/database/updateViewType", {
        viewId: board._id,
        viewTypeId,
        title: currentViewWithSettings?.title || "Form",
        icon: currentViewWithSettings?.icon || "📝",
        isPublicForm: nextState.isPublicForm,
        formAnonymousResponses: nextState.anonymousResponses,
        formAccessToSubmission: nextState.accessToSubmission,
      });

      if (!res.view?.success) {
        toast.error("Failed to update form share settings");
        return;
      }

      const serverView = res.view.viewCollection?.viewsType || res.view.viewsType;

      if (serverView) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          if (vId !== viewTypeId) return v;

          const matching = Array.isArray(serverView)
            ? serverView.find((sv: any) => {
                const svId = typeof sv.id === "string" ? sv.id : String(sv.id);
                return svId === vId;
              })
            : null;

          return {
            ...v,
            isPublicForm: matching?.isPublicForm ?? nextState.isPublicForm,
            formAnonymousResponses: matching?.formAnonymousResponses ?? nextState.anonymousResponses,
            formAccessToSubmission: matching?.formAccessToSubmission ?? nextState.accessToSubmission,
          };
        });

        updateBoard(board._id, { ...latestBoard, viewsType: updatedViewsType });
      } else {
        // Fallback optimistic update
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          if (vId !== viewTypeId) return v;
          return {
            ...v,
            isPublicForm: nextState.isPublicForm,
            formAnonymousResponses: nextState.anonymousResponses,
            formAccessToSubmission: nextState.accessToSubmission,
          };
        });
        updateBoard(board._id, { ...latestBoard, viewsType: updatedViewsType });
      }
    } catch {
      // Error toast already handled in service
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      setIsCopying(true);
      // For now, copy the current URL as the form link. This can be refined to use a dedicated public form URL.
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Form link copied");
    } catch {
      toast.error("Failed to copy link");
    } finally {
      setIsCopying(false);
    }
  };

  const whoCanFillOutLabel =
    isPublicForm ? "Anyone with the link" : "Anyone in workspace with link";

  const accessToSubmissionLabel =
    accessToSubmission === "no_access" ? "No access" : "Respondents can view their submission";

  return (
    <div
      ref={modalRef}
      className="flex flex-col min-w-[400px] max-w-[400px] rounded-lg border bg-background dark:border-gray-700 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-2 space-y-1">
        {/* Who can fill out */}
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-1 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors"
        >
          <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
            <UserRound className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm">Who can fill out</div>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={isPublicForm ? "anyone_with_link" : "workspace_with_link"}
              onChange={(e) => {
                const value = e.target.value === "anyone_with_link";
                setIsPublicForm(value);
                void saveShareState({ isPublicForm: value });
              }}
              onClick={(e) => e.stopPropagation()}
              className=" p-1 bg-transparent border rounded-sm text-sm text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="workspace_with_link">Anyone in workspace with link</option>
              <option value="anyone_with_link">Anyone with the link</option>
            </select>
          </div>
        </button>

        {/* Anonymous responses */}
        <div className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
              <UserCircle2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <ToggleSetting
                label="Anonymous responses"
                description=""
                checked={anonymousResponses}
                onChange={(checked) => {
                  setAnonymousResponses(checked);
                  void saveShareState({ anonymousResponses: checked });
                }}
              />
            </div>
          </div>
        </div>

        {/* Access to submission */}
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-1 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors"
        >
          <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
            <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm">Access to submission</div>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={accessToSubmission}
              onChange={(e) => {
                const value = e.target.value as typeof accessToSubmission;
                setAccessToSubmission(value);
                void saveShareState({ accessToSubmission: value });
              }}
              onClick={(e) => e.stopPropagation()}
              className=" p-1 bg-transparent border rounded-sm text-sm text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="no_access">No access</option>
              <option value="can_view_own">can view</option>
            </select>
          </div>
        </button>
      </div>

      {/* Copy form link */}
      <div className="px-2 py-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative h-8">
            <div className="flex items-center w-full h-full rounded-md border border-gray-300 dark:border-gray-600 bg-background px-2">
              <input
                disabled
                readOnly
                type="text"
                value={window.location.href}
                className="w-full bg-transparent border-none outline-none text-sm text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            {isCopying ? "Copying..." : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}


