import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Paperclip, Trash2, X } from "lucide-react";
import type { Invite } from "@/types/advance-editor";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { Members } from "@/types/workspace";

interface ShareModalProps {
  open: boolean;
  invites: Invite[];
  newEmail: string;
  newPermission: "read" | "write";
  generalAccess: string;
  copied: boolean;
  onClose: () => void;
  onAddInvite: (email: string, permission: "read" | "write") => void;
  onRemoveInvite: (index: number) => void;
  onPermissionChange: (permission: "read" | "write") => void;
  onEmailChange: (email: string) => void;
  onShare: () => void;
  onCopyLink: () => void;
  onGeneralAccessChange?: (access: string) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  open,
  invites,
  newEmail,
  newPermission,
  generalAccess,
  copied,
  onClose,
  onAddInvite,
  onRemoveInvite,
  onPermissionChange,
  onEmailChange,
  onShare,
  onCopyLink,
  onGeneralAccessChange,
}) => {

  const [error, setError] = useState<string | null>(null);
  const { workspaceMembers } = useWorkspaceContext();
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<Members[]>(workspaceMembers);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownListRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!newEmail.trim()) {
      setFilteredMembers(workspaceMembers);
      return;
    }

    const filtered = workspaceMembers.filter(member =>
      member.userName.toLowerCase().includes(newEmail.toLowerCase()) ||
      member.userEmail.toLowerCase().includes(newEmail.toLowerCase())
    );
    setFilteredMembers(filtered);
  }, [newEmail]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMemberDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to highlighted item
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownListRef.current) {
      const dropdownElement = dropdownListRef.current;
      const itemElement = dropdownElement.children[highlightedIndex] as HTMLElement;
      
      if (itemElement) {
        const itemTop = itemElement.offsetTop;
        const itemBottom = itemTop + itemElement.offsetHeight;
        const containerTop = dropdownElement.scrollTop;
        const containerBottom = containerTop + dropdownElement.offsetHeight;

        if (itemTop < containerTop) {
          dropdownElement.scrollTop = itemTop;
        } else if (itemBottom > containerBottom) {
          dropdownElement.scrollTop = itemBottom - dropdownElement.offsetHeight;
        }
      }
    }
  }, [highlightedIndex]);

  const handleMemberSelect = (member: Members) => {
    onEmailChange(member.userEmail);
    setShowMemberDropdown(false);
    setHighlightedIndex(-1);
    setError(null);
  };

  const handleInputFocus = () => {
    setShowMemberDropdown(true);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMemberDropdown || filteredMembers.length === 0) return;
  
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const newIndex = prev < filteredMembers.length - 1 ? prev + 1 : 0;
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : filteredMembers.length - 1;
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredMembers.length) {
          const selectedMember = filteredMembers[highlightedIndex];
          if (selectedMember) {
            handleMemberSelect(selectedMember);
          }
        }
        break;
      case 'Escape':
        setShowMemberDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Share Note</h2>
          <button
            type="button"
            onClick={() => {
              onClose();
              setError(null);
              setShowMemberDropdown(false);
              setHighlightedIndex(-1);
            }}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-lg font-bold"
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        {/* Add email + permission row */}
        <div className="relative w-full" ref={dropdownRef}>
          <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="email"
                required
                pattern="^[^@\s]+@[^@\s]+\.[^@\s]+$"
                value={newEmail}
                onChange={(e) => {
                  onEmailChange(e.target.value);
                  if (error) setError(null);
                  setHighlightedIndex(-1);
                }}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                placeholder="Enter email"
                className="w-full px-2 h-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md outline-none"
              />
            <select
              value={newPermission}
              onChange={(e) => onPermissionChange(e.target.value as "read" | "write")}
              className="absolute right-[80px] h-8 top-1/2 -translate-y-1/2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 text-sm rounded-md outline-none"
            >
              <option value="read">Read</option>
              <option value="write">Write</option>
            </select>
            <button
              type="button"
              disabled={!!error}
              onClick={() => {
                if (!newEmail.trim()) return;
                const email = newEmail.trim();
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                  setError("Please enter a valid email address.");
                  return;
                }

                const alreadyInvited = invites.some((invite) => invite.email === email);
                if (alreadyInvited) {
                  setError("This email is already added.");
                  return;
                }

                setError(null);
                onAddInvite(email, newPermission);
                setShowMemberDropdown(false);
                setHighlightedIndex(-1);
              }}
              className={`h-10 text-white px-3 py-2 rounded-md
                ${error ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
            {filteredMembers.length > 0 ? "Add" : "Invite"}
            </button>
          </div>

          {/* Member Dropdown */}
          {showMemberDropdown && (
            <>
              {filteredMembers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-2xl drop-shadow-xl z-10 max-h-54 overflow-hidden w-[85%]">
                  <div 
                    ref={dropdownListRef}
                    className="max-h-48 overflow-y-auto my-2"
                  >
                    {filteredMembers.map((member, index) => (
                      <button
                        key={member.userEmail}
                        type="button"
                        onClick={() => handleMemberSelect(member)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`w-full px-3 py-2 text-left flex items-center gap-3 border-b border-gray-100 dark:border-gray-600 last:border-b-0 ${
                          index === highlightedIndex 
                            ? "bg-blue-100 dark:bg-gray-600" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-medium flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                            {member.userName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {member.userEmail}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Shared With List */}
        {invites.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">Shared With</h3>
            <div className="max-h-32 overflow-y-auto space-y-2 custom-scroll p-1">
              {invites.map((invite, index) => (
                <div
                  key={`${invite?.email}-${index}`}
                  className="flex items-center bg-gray-100 dark:bg-gray-600 rounded-lg p-2 gap-2"
                >
                  <div className="flex-1 overflow-x-hidden whitespace-nowrap text-gray-900 dark:text-gray-200 font-medium text-sm custom-scroll px-1">
                    {invite.email}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 px-2 shrink-0">
                    {invite.permission === "write" ? "Read & Write" : "Read"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (newEmail === invites[index]?.email) {
                        setError(null);
                      }
                      onRemoveInvite(index);
                    }}
                    className="shrink-0 pr-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General Access (optional) */}
        {/* {onGeneralAccessChange && (
          <div className="space-y-2">
            <label htmlFor="generalAccess" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              General Access
            </label>
            <select
              value={generalAccess}
              onChange={(e) => onGeneralAccessChange(e.target.value)}
              className="w-full p-2 rounded-md border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="1">Restricted</option>
              <option value="0">Private</option>
              <option value="2">Anyone with Link</option>
            </select>
          </div>
        )} */}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => {
              onShare();
              setError(null);
              onEmailChange("");
              setShowMemberDropdown(false);
              setHighlightedIndex(-1);
            }}
            disabled={invites.length === 0}
            className={`px-3 py-1 rounded-md font-base text-white 
              ${invites.length === 0 ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            Share
          </button>
          <button type="button" className="text-sm text-blue-500" onClick={onCopyLink}>
            {copied ? (
              <span className="text-blue-500 font-medium dark:text-blue-500">Copied!</span>
            ) : (
              <div className="flex p-1 items-center hover:underline">
                <Paperclip className="h-4" />
                <span>Copy link</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;