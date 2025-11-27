"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { postWithAuth } from "@/lib/api-helpers";
import { useWorkspaceContext } from "@/contexts/workspaceContext";

interface InviteModalProps {
  onClose: () => void;
}

export default function InviteModal({ onClose }: InviteModalProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentWorkspace } = useWorkspaceContext();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 🔹 Prevent body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // 🔹 Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 🔹 Keyboard shortcuts: ESC = close, Enter = submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !loading && inputValue.trim() === "") {
        handleSendInvite();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [emails, inputValue, loading]);

  // 🔹 Prevent clicks inside modal from closing settings modal
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && modalRef.current.contains(e.target as Node)) {
        e.stopPropagation();
      }
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    return () => document.removeEventListener("mousedown", handleMouseDown, true);
  }, []);

  // 🔹 Add email as chip when pressing Enter or comma
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;

      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
      if (!isValidEmail) {
        toast.error("Invalid email format");
        return;
      }
      if (emails.includes(trimmed)) {
        toast.info("Email already added");
        return;
      }

      setEmails([...emails, trimmed]);
      setInputValue("");
    }
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  const handleSendInvite = async () => {
    if (emails.length === 0) return toast.error("Add at least one valid email");

    try {
      setLoading(true);
      await postWithAuth("/api/workSpace/addMember", {
        membersEmail: emails,
        workspaceId: currentWorkspace?._id,
      });
      toast.success("Invites sent!");
      onClose();
    } catch (err) {
      toast.error("Failed to send invites");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (typeof window === "undefined") return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the backdrop, not on the modal content
    if (e.target === backdropRef.current || e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Stop propagation to prevent settings modal from closing
    e.stopPropagation();
  };

  return createPortal(
    <div 
      ref={backdropRef}
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-[rgb(18,18,18)] w-[460px] rounded-xl p-5 flex flex-col gap-6 shadow-xl animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-[rgb(30,30,30)] rounded-full">
            <UserPlus className="w-6 h-6 text-gray-500 dark:text-gray-300" />
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add members</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Type or paste emails and press <span className="font-medium">Enter</span>
          </div>
        </div>

        {/* Email chips + input */}
        <div className="w-full border rounded-md p-2 bg-gray-50 dark:bg-[rgb(30,30,30)] flex flex-wrap gap-2">
          {emails.map((email) => (
            <span
              key={email}
              className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium"
            >
              {email}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-500"
                onClick={() => removeEmail(email)}
              />
            </span>
          ))}

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={emails.length ? "" : "Enter emails (Separated by comma) and press Enter"}
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border rounded-md hover:bg-gray-100 dark:hover:bg-[rgb(42,42,42)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSendInvite}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send invite"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
