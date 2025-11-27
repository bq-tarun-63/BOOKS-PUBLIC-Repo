"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { X } from "lucide-react";
import { useSettingsModal } from "@/contexts/settingsModalContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { useAuth } from "@/hooks/use-auth";
import ToggleSetting from "../components/ToggleSetting";
import { EMOJI_CATEGORIES } from "@/components/tailwind/editor/EmojiPicker";

export default function GeneralContent() {
  const {
    workspaceSettings,
    updateWorkspaceName,
    updateWorkspaceIcon,
    updateAllowedEmailDomains,
    toggleAnalytics,
    toggleProfiles,
    toggleHoverCards,
    exportWorkspace,
    deleteWorkspace,
    copyWorkspaceId,
  } = useSettingsModal();
  const { currentWorkspace, workspaceMembers } = useWorkspaceContext();
  const { user } = useAuth();
  const [workspaceName, setWorkspaceName] = useState(workspaceSettings.name);
  const [emailDomains, setEmailDomains] = useState<string[]>(workspaceSettings.allowedEmailDomains);
  const [newDomain, setNewDomain] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const iconButtonRef = useRef<HTMLDivElement>(null);
  const [emojiSearchTerm, setEmojiSearchTerm] = useState("");
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>("Recent");
  const emojiCategoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Get current user's role - check by email and role in members array
  const currentUserMember = workspaceMembers.find(
    (m) => m.userEmail === user?.email
  );
  
  // Find owner by checking member with role "owner"
  const ownerMember = workspaceMembers.find((m) => m.role === "owner");
  const isOwner = ownerMember?.userEmail === user?.email;
  
  // Determine current user's role
  const currentUserRole = isOwner
    ? "owner"
    : (currentUserMember?.role === "admin"
        ? "admin"
        : (currentUserMember?.role === "member"
            ? "member"
            : null));

  // Check if user can edit workspace settings (owner or admin)
  const canEditWorkspace = currentUserRole === "owner" || currentUserRole === "admin";
  
  // Check if user can delete workspace (only owner)
  const canDeleteWorkspace = currentUserRole === "owner";

  // Sync with context when it changes
  useEffect(() => {
    setWorkspaceName(workspaceSettings.name);
    setEmailDomains(workspaceSettings.allowedEmailDomains);
  }, [workspaceSettings]);

  const handleNameChange = (value: string) => {
    setWorkspaceName(value);
  };

  const handleNameBlur = () => {
    if (canEditWorkspace && workspaceName.trim() && workspaceName !== workspaceSettings.name) {
      updateWorkspaceName(workspaceName.trim());
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleDomainKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newDomain.trim()) {
      const domain = newDomain.trim().toLowerCase();
      if (!emailDomains.includes(domain) && domain.includes(".")) {
        const updated = [...emailDomains, domain];
        setEmailDomains(updated);
        updateAllowedEmailDomains(updated);
        setNewDomain("");
      }
    }
  };

  const removeDomain = (domain: string) => {
    const updated = emailDomains.filter((d) => d !== domain);
    setEmailDomains(updated);
    updateAllowedEmailDomains(updated);
  };

  // Prevent body scroll when emoji picker is open
  useEffect(() => {
    if (showEmojiPicker) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showEmojiPicker]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        iconButtonRef.current &&
        !iconButtonRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.emoji-picker-container')
      ) {
        setShowEmojiPicker(false);
        setEmojiSearchTerm("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const filteredEmojis = useMemo(() => {
    if (!emojiSearchTerm) return EMOJI_CATEGORIES;
    
    const filtered: Record<string, string[]> = {};
    Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
      const matches = emojis.filter((emoji) => emoji.includes(emojiSearchTerm));
      if (matches.length > 0) {
        filtered[category] = matches;
      }
    });
    return filtered;
  }, [emojiSearchTerm]);

  const scrollToEmojiCategory = useCallback((category: string) => {
    const element = emojiCategoryRefs.current[category];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleIconClick = () => {
    setShowEmojiPicker(true);
  };

  const handleEmojiSelect = (emoji: string) => {
    updateWorkspaceIcon(emoji);
    setShowEmojiPicker(false);
    setEmojiSearchTerm("");
  };

  const handleEmojiClose = () => {
    setShowEmojiPicker(false);
    setEmojiSearchTerm("");
  };

  const handleEmojiRemove = () => {
    updateWorkspaceIcon("");
    setShowEmojiPicker(false);
    setEmojiSearchTerm("");
  };

  return (
    <div className="space-y-12">
      {/* Workspace settings section */}
      <div>
        <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100">
          Workspace settings
        </div>

        {/* Name input */}
        <div className="pb-6">
          <div className="border-b-0 mb-2 mt-0 pb-0 text-sm font-normal w-auto text-zinc-900 dark:text-zinc-100">
            Name
          </div>
          <div className={`flex items-center w-full text-sm leading-5 relative rounded-md shadow-sm bg-zinc-50 dark:bg-zinc-800 ${canEditWorkspace ? 'cursor-text' : 'cursor-not-allowed opacity-60'} pt-1 pb-1 px-2.5`}>
            <input
              placeholder="e.g. company name"
              maxLength={65}
              type="text"
              value={workspaceName}
              onChange={(e) => canEditWorkspace && handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              disabled={!canEditWorkspace}
              className="text-sm leading-5 border-none bg-transparent w-full block resize-none p-0 text-zinc-900 dark:text-zinc-100 focus:outline-none disabled:cursor-not-allowed"
            />
          </div>
          <div className="text-xs leading-4 text-zinc-600 dark:text-zinc-400 mt-1">
            {canEditWorkspace 
              ? "You can use your organization or company name. Keep it simple."
              : "Only workspace owners and admins can change the workspace name."}
          </div>
        </div>

        {/* Icon picker */}
        <div className="pb-6">
          <div className="border-b-0 mb-2 mt-0 pb-0 text-sm font-normal w-auto text-zinc-900 dark:text-zinc-100">
            Icon
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                ref={iconButtonRef}
                role="button"
                tabIndex={canEditWorkspace ? 0 : -1}
                onClick={canEditWorkspace ? handleIconClick : undefined}
                className={`user-select-none transition-colors duration-200 ease-in flex items-center justify-center h-20 w-20 rounded-[0.25em] flex-shrink-0 border border-zinc-200 dark:border-zinc-700 ${canEditWorkspace ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800' : 'cursor-not-allowed opacity-60'}`}
              >
                <div
                  role="img"
                  aria-label={workspaceSettings.icon || "Workspace icon"}
                  className="rounded-[0.25em] w-10 h-10 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 uppercase flex items-center justify-center"
                >
                  <div className="leading-none text-5xl">
                    {workspaceSettings.icon || currentWorkspace?.name?.charAt(0).toUpperCase() || "W"}
                  </div>
                </div>
              </div>
              {showEmojiPicker && canEditWorkspace && (
                <div className="absolute top-full left-0 mt-2 z-[100] emoji-picker-container">
                  <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden w-[408px] max-w-[calc(100vw-24px)] h-[390px] max-h-[70vh] flex flex-col">
                    {/* Tabs */}
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 px-2 overflow-x-auto hide-scrollbar">
                      <div className="flex gap-1 py-1.5">
                        {Object.keys(EMOJI_CATEGORIES).map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setActiveEmojiCategory(category);
                              scrollToEmojiCategory(category);
                            }}
                            className={`px-2 h-7 rounded-md text-sm transition-colors whitespace-nowrap ${
                              activeEmojiCategory === category
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            {category}
                            {activeEmojiCategory === category && (
                              <div className="h-0.5 bg-gray-900 dark:bg-white mt-1" />
                            )}
                          </button>
                        ))}
                      </div>
                      {workspaceSettings.icon && (
                        <button
                          type="button"
                          onClick={handleEmojiRemove}
                          className="px-2 h-7 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Search */}
                    <div className="px-2 py-2">
                      <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 rounded-md px-2 h-7">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Filter…"
                          value={emojiSearchTerm}
                          onChange={(e) => setEmojiSearchTerm(e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-500"
                        />
                      </div>
                    </div>

                    {/* Emoji Grid */}
                    <div className="flex-1 overflow-y-auto px-3 pb-2">
                      {Object.entries(filteredEmojis).map(([category, emojis]) => (
                        <div 
                          key={category} 
                          className="mb-4"
                          ref={(el) => { emojiCategoryRefs.current[category] = el }}
                        >
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2 pt-2">
                            {category}
                          </div>
                          <div className="grid grid-cols-12 gap-1">
                            {emojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleEmojiSelect(emoji)}
                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-2xl"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {workspaceSettings.icon && canEditWorkspace && (
              <button
                type="button"
                onClick={() => updateWorkspaceIcon("")}
                className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          <div className="text-xs leading-4 text-zinc-600 dark:text-zinc-400 mt-2">
            {canEditWorkspace 
              ? "Upload an image or pick an emoji. It will show up in your sidebar and notifications."
              : "Only workspace owners and admins can change the workspace icon."}
          </div>
        </div>
      </div>

      {/* Trusted domain access section */}
      <div>
        <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100 pt-3">
          Trusted domain access
        </div>
        <div className="pb-6">
          <div className="border-b-0 mb-2 mt-0 pb-0 text-sm font-normal w-auto text-zinc-900 dark:text-zinc-100">
            Allowed email domains
          </div>
          <div className="flex flex-wrap items-start min-h-8 shadow-sm bg-zinc-50 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-sm cursor-text overflow-hidden py-1.5 px-2">
            {emailDomains.map((domain) => (
              <div
                key={domain}
                className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-700 rounded px-2 py-0.5 text-xs mr-1 mb-1"
              >
                <span>{domain}</span>
                <button
                  onClick={() => removeDomain(domain)}
                  className="hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <input
              size={1}
              placeholder="Type an email domain…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={handleDomainKeyDown}
              className="text-sm leading-5 border-none bg-transparent w-full block resize-none p-0 h-[18px] flex-1 min-w-[60px] mx-1.5 mb-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>
          <div className="text-xs leading-4 text-zinc-600 dark:text-zinc-400 mt-1 mb-1">
            Anyone with email addresses at these domains can automatically join your workspace.
          </div>
        </div>
      </div>

      {/* Export section */}
      <div>
        <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100 pt-3">
          Export
        </div>
        <div className="pb-6">
          <div className="flex items-center justify-between cursor-default">
            <div className="flex flex-col mr-[5%] w-3/4 gap-1.5">
              <div className="text-zinc-900 dark:text-zinc-100 text-sm leading-5 font-normal">
                <div className="flex flex-row gap-1 items-center">
                  <span>Workspace content</span>
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    <svg
                      aria-hidden="true"
                      role="graphics-symbol"
                      viewBox="0 0 16 16"
                      className="w-4 h-4 block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0 flex-grow-0"
                    >
                      <path d="M8 14.07a6.1 6.1 0 0 1-6.05-6.05c0-.83.15-1.6.47-2.34a6.17 6.17 0 0 1 5.57-3.71c.83 0 1.61.16 2.34.47a6.19 6.19 0 0 1 3.72 5.58c0 .83-.16 1.6-.47 2.34a6.19 6.19 0 0 1-3.25 3.24 5.9 5.9 0 0 1-2.34.47Zm0-1.2a4.77 4.77 0 0 0 3.43-1.41A4.87 4.87 0 1 0 8 12.88ZM7.86 9.2c-.38 0-.56-.17-.56-.5v-.07a1 1 0 0 1 .2-.65 2 2 0 0 1 .52-.47c.25-.17.43-.32.56-.44a.61.61 0 0 0 .18-.46.6.6 0 0 0-.22-.48.83.83 0 0 0-.57-.2.9.9 0 0 0-.6.23c-.09.07-.16.16-.23.26l-.1.13a.61.61 0 0 1-.2.17.53.53 0 0 1-.26.07.48.48 0 0 1-.32-.13.42.42 0 0 1-.14-.33v-.15l.05-.15c.1-.28.3-.51.62-.71.33-.2.75-.3 1.25-.3.35 0 .66.06.95.18.3.12.53.3.7.52.18.23.27.5.27.83 0 .34-.09.61-.26.81-.18.2-.4.4-.69.59-.2.12-.34.24-.45.35a.63.63 0 0 0-.16.4v.07a.45.45 0 0 1-.16.3.56.56 0 0 1-.38.13ZM7.84 11a.7.7 0 0 1-.48-.19.61.61 0 0 1-.2-.46.6.6 0 0 1 .2-.46.7.7 0 0 1 .48-.18c.2 0 .36.06.49.18s.2.27.2.46a.6.6 0 0 1-.2.46.7.7 0 0 1-.49.18Z" />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 text-[13px] leading-[18px] font-normal">
                Export all pages in {currentWorkspace?.name || "Workspace"} as HTML, Markdown, CSV or PDF
              </div>
            </div>
            <button
              role="button"
              tabIndex={0}
              onClick={exportWorkspace}
              className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-7 px-2 rounded-md whitespace-nowrap text-sm justify-center font-medium leading-[1.2] border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              Export
            </button>
          </div>
        </div>
        <div className="pb-6">
          <div className="flex items-center justify-between cursor-not-allowed">
            <div className="flex flex-col mr-[5%] w-3/4">
              <div className="text-zinc-900 dark:text-zinc-100 text-sm leading-5 font-normal">
                <div className="flex flex-row gap-1 items-center">
                  <span>Members</span>
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    <svg
                      aria-hidden="true"
                      role="graphics-symbol"
                      viewBox="0 0 16 16"
                      className="w-4 h-4 block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0 flex-grow-0"
                    >
                      <path d="M8 14.07a6.1 6.1 0 0 1-6.05-6.05c0-.83.15-1.6.47-2.34a6.17 6.17 0 0 1 5.57-3.71c.83 0 1.61.16 2.34.47a6.19 6.19 0 0 1 3.72 5.58c0 .83-.16 1.6-.47 2.34a6.19 6.19 0 0 1-3.25 3.24 5.9 5.9 0 0 1-2.34.47Zm0-1.2a4.77 4.77 0 0 0 3.43-1.41A4.87 4.87 0 1 0 8 12.88ZM7.86 9.2c-.38 0-.56-.17-.56-.5v-.07a1 1 0 0 1 .2-.65 2 2 0 0 1 .52-.47c.25-.17.43-.32.56-.44a.61.61 0 0 0 .18-.46.6.6 0 0 0-.22-.48.83.83 0 0 0-.57-.2.9.9 0 0 0-.6.23c-.09.07-.16.16-.23.26l-.1.13a.61.61 0 0 1-.2.17.53.53 0 0 1-.26.07.48.48 0 0 1-.32-.13.42.42 0 0 1-.14-.33v-.15l.05-.15c.1-.28.3-.51.62-.71.33-.2.75-.3 1.25-.3.35 0 .66.06.95.18.3.12.53.3.7.52.18.23.27.5.27.83 0 .34-.09.61-.26.81-.18.2-.4.4-.69.59-.2.12-.34.24-.45.35a.63.63 0 0 0-.16.4v.07a.45.45 0 0 1-.16.3.56.56 0 0 1-.38.13ZM7.84 11a.7.7 0 0 1-.48-.19.61.61 0 0 1-.2-.46.6.6 0 0 1 .2-.46.7.7 0 0 1 .48-.18c.2 0 .36.06.49.18s.2.27.2.46a.6.6 0 0 1-.2.46.7.7 0 0 1-.49.18Z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            <div className="ml-[-4px]">
              <div
                role="button"
                tabIndex={0}
                className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center gap-1 h-5 px-1 rounded whitespace-normal text-xs flex-shrink-0 leading-[1.2] min-w-0 text-zinc-900 dark:text-zinc-100 w-fit min-h-fit"
              >
                <svg
                  aria-hidden="true"
                  role="graphics-symbol"
                  viewBox="2.37 2.37 15.25 15.26"
                  className="w-3 h-3 block fill-blue-600 dark:fill-blue-400 flex-shrink-0"
                >
                  <rect x="2.5" y="2.5" width="15" height="15" rx="7.5" />
                  <path d="M13.0419 9.55439C12.7978 9.79847 12.4021 9.79847 12.158 9.55439L10.625 8.02136L10.625 13.4874C10.625 13.8326 10.3452 14.1124 10 14.1124C9.65482 14.1124 9.375 13.8326 9.375 13.4874L9.375 8.02131L7.84192 9.5544C7.59784 9.79847 7.20211 9.79847 6.95804 9.5544C6.71396 9.31032 6.71396 8.91459 6.95803 8.67051L9.55803 6.07051C9.67524 5.9533 9.83421 5.88745 9.99997 5.88745C10.1657 5.88745 10.3247 5.9533 10.4419 6.07051L13.0419 8.67051C13.286 8.91459 13.286 9.31032 13.0419 9.55439Z" fill="white" />
                </svg>
                <div className="text-zinc-600 dark:text-zinc-400">
                  <div className="text-blue-600 dark:text-blue-400 text-xs leading-4 font-medium inline">
                    Upgrade
                  </div>{" "}
                  to get a list of members and guests in your workspace
                </div>
              </div>
            </div>
          </div>
          <div className="flex">
            <button
              aria-disabled="true"
              role="button"
              tabIndex={-1}
              disabled
              className="user-select-none transition-colors duration-200 ease-in cursor-default opacity-40 inline-flex items-center h-8 px-3 rounded-md whitespace-nowrap text-sm justify-center font-medium leading-[1.2] border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100"
            >
              Export members as CSV
            </button>
          </div>
        </div>
      </div>

      {/* Analytics section */}
      <div>
        <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100 pt-3">
          Analytics
        </div>
        <div className="flex gap-3 flex-col pb-6">
          <ToggleSetting
            label="Save and display page view analytics"
            description={`People with edit or full access will be able to see how many views a page has. If this is turned off, page views will not be stored for all pages in ${currentWorkspace?.name || "Workspace"}.`}
            checked={workspaceSettings.analyticsEnabled}
            onChange={(checked) => toggleAnalytics(checked)}
          />
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="flex text-current no-underline select-none cursor-pointer ml-[-6px]"
          >
            <div
              role="button"
              tabIndex={0}
              className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center gap-1 h-6 px-1.5 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 text-zinc-500 dark:text-zinc-400"
            >
              <svg
                aria-hidden="true"
                role="graphics-symbol"
                viewBox="0 0 16 16"
                className="w-4 h-4 block fill-current flex-shrink-0"
              >
                <path d="M7.98 4.456c-1.044 0-2.053.604-2.298 1.584a.575.575 0 1 0 1.116.279c.083-.334.513-.713 1.183-.713.79 0 1.204.49 1.204.85 0 .219-.134.47-.443.658l-.011.006-.67.458-.003.002a1.82 1.82 0 0 0-.803 1.488.575.575 0 1 0 1.15 0c0-.193.102-.4.306-.541l.642-.44c.554-.342.982-.92.982-1.63 0-1.22-1.179-2-2.354-2m-.118 5.688a.775.775 0 1 0 0 1.55.775.775 0 0 0 0-1.55" />
                <path d="M8 1.875a6.125 6.125 0 1 0 0 12.25 6.125 6.125 0 0 0 0-12.25M3.125 8a4.875 4.875 0 1 1 9.75 0 4.875 4.875 0 0 1-9.75 0" />
              </svg>
              Learn about workspace analytics.
            </div>
          </a>
        </div>
      </div>

      {/* People section */}
      <div>
        <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100 pt-3">
          People
        </div>
        <div className="pb-6">
          <ToggleSetting
            label="Profiles"
            description="Enable user profiles"
            checked={workspaceSettings.profilesEnabled}
            onChange={(checked) => toggleProfiles(checked)}
          />
        </div>
        <div className="pb-6">
          <ToggleSetting
            label="Hover cards"
            description="Show information on hover over name"
            checked={workspaceSettings.hoverCardsEnabled}
            onChange={(checked) => toggleHoverCards(checked)}
          />
        </div>
      </div>

      {/* Danger zone */}
      {canDeleteWorkspace && (
        <div>
          <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100 pt-3">
            Danger zone
          </div>
          <div className="flex flex-wrap gap-4 gap-y-3">
            <button
              role="button"
              tabIndex={0}
              onClick={deleteWorkspace}
              className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-8 px-3 rounded-md whitespace-nowrap text-sm justify-center font-medium leading-[1.2] border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Delete entire workspace
            </button>
          </div>
        <div className="h-3" />
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="flex text-current no-underline select-none cursor-pointer ml-[-6px]"
        >
          <div
            role="button"
            tabIndex={0}
            className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center gap-1 h-6 px-1.5 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0 text-zinc-500 dark:text-zinc-400"
          >
            <svg
              aria-hidden="true"
              role="graphics-symbol"
              viewBox="0 0 16 16"
              className="w-4 h-4 block fill-current flex-shrink-0"
            >
              <path d="M7.98 4.456c-1.044 0-2.053.604-2.298 1.584a.575.575 0 1 0 1.116.279c.083-.334.513-.713 1.183-.713.79 0 1.204.49 1.204.85 0 .219-.134.47-.443.658l-.011.006-.67.458-.003.002a1.82 1.82 0 0 0-.803 1.488.575.575 0 1 0 1.15 0c0-.193.102-.4.306-.541l.642-.44c.554-.342.982-.92.982-1.63 0-1.22-1.179-2-2.354-2m-.118 5.688a.775.775 0 1 0 0 1.55.775.775 0 0 0 0-1.55" />
              <path d="M8 1.875a6.125 6.125 0 1 0 0 12.25 6.125 6.125 0 0 0 0-12.25M3.125 8a4.875 4.875 0 1 1 9.75 0 4.875 4.875 0 0 1-9.75 0" />
            </svg>
            Learn about deleting workspaces.
          </div>
        </a>
        </div>
      )}

      {/* Workspace ID section */}
      <div className="pt-9">
        <div className="border-b border-zinc-200 dark:border-zinc-700 mb-4 mt-0 pb-3 text-base font-medium w-auto text-zinc-900 dark:text-zinc-100">
          Workspace ID
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <div className="grid-row-start-1 grid-col-start-1">
            <div className="h-full flex items-center">
              <div className="text-xs leading-4 text-zinc-600 dark:text-zinc-400">Workspace ID</div>
            </div>
          </div>
          <div className="grid-row-start-1 grid-col-start-2">
            <div className="h-full flex items-center justify-end gap-2">
              <div className="text-xs leading-4 text-zinc-600 dark:text-zinc-400">
                {currentWorkspace?._id || "N/A"}
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={copyWorkspaceId}
                aria-label="Click to copy ID"
                className="user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center justify-center flex-shrink-0 rounded-md h-6 w-6 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <svg
                  aria-hidden="true"
                  role="graphics-symbol"
                  viewBox="0 0 20 20"
                  className="w-4 h-4 block fill-zinc-500 dark:fill-zinc-400 flex-shrink-0"
                >
                  <path d="M4.5 2.375A2.125 2.125 0 0 0 2.375 4.5V12c0 1.174.951 2.125 2.125 2.125h1.625v1.625c0 1.174.951 2.125 2.125 2.125h7.5a2.125 2.125 0 0 0 2.125-2.125v-7.5a2.125 2.125 0 0 0-2.125-2.125h-1.625V4.5A2.125 2.125 0 0 0 12 2.375zm8.375 3.75H8.25A2.125 2.125 0 0 0 6.125 8.25v4.625H4.5A.875.875 0 0 1 3.625 12V4.5c0-.483.392-.875.875-.875H12c.483 0 .875.392.875.875zm-5.5 2.125c0-.483.392-.875.875-.875h7.5c.483 0 .875.392.875.875v7.5a.875.875 0 0 1-.875.875h-7.5a.875.875 0 0 1-.875-.875z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

