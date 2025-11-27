"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, CheckCircle, HelpCircle } from "lucide-react";
import { useWorkAreaContext } from "@/contexts/workAreaContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import EmojiPicker, { Theme } from "emoji-picker-react";

interface CreateWorkAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AccessLevel = "default" | "open" | "closed" | "private";

export default function CreateWorkAreaModal({
  isOpen,
  onClose,
}: CreateWorkAreaModalProps) {
  const { createWorkspaceWorkArea } = useWorkAreaContext();
  const { currentWorkspace } = useWorkspaceContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("open");
  const [isAccessDropdownOpen, setIsAccessDropdownOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerTheme, setEmojiPickerTheme] = useState<Theme>(Theme.LIGHT);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<"bottom" | "top">("bottom");
  
  const modalRef = useRef<HTMLDivElement>(null);
  const accessButtonRef = useRef<HTMLButtonElement>(null);
  const accessDropdownRef = useRef<HTMLDivElement>(null);
  const iconButtonRef = useRef<HTMLDivElement>(null);
  const emojiPickerContainerRef = useRef<HTMLDivElement>(null);

  // Set emoji picker theme based on system preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("theme");
      setEmojiPickerTheme(stored === "dark" ? Theme.DARK : Theme.LIGHT);
    }
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setIcon("");
      setAccessLevel("open");
      setIsAccessDropdownOpen(false);
      setShowEmojiPicker(false);
    }
  }, [isOpen]);

  // Calculate emoji picker position based on available space
  useEffect(() => {
    if (!showEmojiPicker || !iconButtonRef.current) return;

    const calculatePosition = () => {
      if (!iconButtonRef.current) return;
      
      const buttonRect = iconButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const emojiPickerHeight = 450; // Height of emoji picker
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      // Position above if not enough space below, but enough space above
      if (spaceBelow < emojiPickerHeight && spaceAbove > emojiPickerHeight) {
        setEmojiPickerPosition("top");
      } else {
        setEmojiPickerPosition("bottom");
      }
    };

    calculatePosition();
    
    // Recalculate on scroll or resize
    window.addEventListener('scroll', calculatePosition, true);
    window.addEventListener('resize', calculatePosition);
    
    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [showEmojiPicker]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is outside the icon button and emoji picker container
      const isClickInsideIconButton = iconButtonRef.current?.contains(target);
      const isClickInsideEmojiPicker = emojiPickerContainerRef.current?.contains(target);
      
      if (!isClickInsideIconButton && !isClickInsideEmojiPicker) {
        setShowEmojiPicker(false);
      }
    };

    // Use capture phase to catch clicks earlier
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showEmojiPicker]);

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

  const handleAccessChange = (newAccessLevel: AccessLevel) => {
    setAccessLevel(newAccessLevel);
    setIsAccessDropdownOpen(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a work area name");
      return;
    }

    setIsCreating(true);
    try {
      // Convert "default" to "open" for the context function, but we'll handle "default" differently if needed
      const levelToSend = accessLevel === "default" ? "open" : accessLevel;
      const workArea = await createWorkspaceWorkArea(
        name.trim(),
        description.trim() || undefined,
        icon.trim() || undefined,
        levelToSend as "open" | "closed" | "private"
      );

      if (workArea) {
        onClose();
      }
    } catch (error) {
      console.error("Error creating work area:", error);
      toast.error("Failed to create work area");
    } finally {
      setIsCreating(false);
    }
  };

  const getAccessDisplay = (level: AccessLevel) => {
    switch (level) {
      case "open":
        return "Open";
      case "closed":
        return "Closed";
      case "private":
        return "Private";
      default:
        return "Open";
    }
  };

  const getAccessDescription = (level: AccessLevel) => {
    const workspaceName = currentWorkspace?.name || "workspace";
    switch (level) {
      case "open":
        return "Anyone can see and join this teamspace";
      case "closed":
        return "Anyone can see this teamspace but not join";
      case "private":
        return "Only members can see that this teamspace exists";
      default:
        return "Anyone can see and join this teamspace";
    }
  };

  const accessDisplay = getAccessDisplay(accessLevel);
  const accessDescription = getAccessDescription(accessLevel);

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
        className="relative bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-700 w-[480px] max-w-[calc(100vw-100px)] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Content */}
        <div className="p-[26px] flex flex-col items-center">
          {/* Title */}
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Create a new Work Area
          </div>
          <div className="text-xs leading-4 text-zinc-600 dark:text-zinc-400 mb-[26px] text-center">
            Work Areas are where your team organizes pages, permissions, and members
          </div>

          {/* Icon & Name */}
          <div className="w-full mb-4">
            <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
              Icon & name
            </label>
            <div className="flex items-start gap-2">
              {/* Icon Display */}
              <div className="flex-shrink-0 relative" ref={iconButtonRef}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-[26px] h-[26px] rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
                >
                  {icon ? (
                    <span className="text-sm">{icon}</span>
                  ) : (
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase">
                      {name.charAt(0) || "T"}
                    </span>
                  )}
                </button>
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerContainerRef}
                    className={cn(
                      "absolute left-0 z-[12000] emoji-picker-container",
                      emojiPickerPosition === "top" 
                        ? "bottom-full mb-2" 
                        : "top-full mt-2"
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setIcon(emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                      height={450}
                      width={400}
                      theme={emojiPickerTheme}
                    />
                  </div>
                )}
              </div>
              {/* Name Input */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Acme Labs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-[10px] py-1 text-sm leading-5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="w-full mb-4">
            <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
              Description
            </label>
            <textarea
              placeholder="Details about your workarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-[10px] py-1 text-sm leading-5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Permissions */}
          <div className="w-full mb-6">
            <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
              Permissions
            </label>
            <div className="relative">
              <button
                ref={accessButtonRef}
                onClick={() => setIsAccessDropdownOpen(!isAccessDropdownOpen)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1 rounded-md border transition-colors text-sm min-h-[45px]",
                  isAccessDropdownOpen
                    ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600"
                    : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                )}
              >
                <div className="flex items-center justify-center min-w-[20px] min-h-[20px]">
                  {accessLevel === "default" ? (
                    <svg
                      aria-hidden="true"
                      role="graphics-symbol"
                      viewBox="0 0 20 20"
                      className="w-5 h-5 fill-black dark:fill-white flex-shrink-0"
                    >
                      <path d="M10 2.375a7.625 7.625 0 1 1 0 15.25 7.625 7.625 0 0 1 0-15.25m-1.863 8.25c.054 1.559.31 2.937.681 3.943.212.572.449.992.68 1.256.232.266.404.318.502.318s.27-.052.502-.318c.231-.264.468-.684.68-1.256.371-1.006.627-2.384.681-3.943zm-4.48 0a6.38 6.38 0 0 0 4.509 5.48 6.5 6.5 0 0 1-.52-1.104c-.431-1.167-.704-2.697-.76-4.376zm9.456 0c-.055 1.679-.327 3.21-.758 4.376-.15.405-.324.779-.522 1.104a6.38 6.38 0 0 0 4.51-5.48zM8.166 3.894a6.38 6.38 0 0 0-4.51 5.481h3.23c.056-1.679.328-3.21.76-4.376.15-.405.322-.78.52-1.105M10 3.858c-.099 0-.27.053-.502.319-.231.264-.468.683-.68 1.255-.371 1.006-.627 2.384-.681 3.943h3.726c-.054-1.559-.31-2.937-.681-3.943-.212-.572-.449-.99-.68-1.255-.232-.266-.404-.319-.502-.319m1.833.036c.198.326.372.7.521 1.105.432 1.167.704 2.697.76 4.376h3.23a6.38 6.38 0 0 0-4.511-5.481"></path>
                    </svg>
                  ) : accessLevel === "open" ? (
                    <svg
                      aria-hidden="true"
                      role="graphics-symbol"
                      viewBox="0 0 20 20"
                      className="w-5 h-5 fill-black dark:fill-white flex-shrink-0"
                    >
                      <path d="M6.625 6.625a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0M5.95 9.55a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35m.675 1.575a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0M9.1 7.3a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35m.675 1.575a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0M9.1 11.8a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35m6.413.225a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0m-.675 2.925a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35"></path>
                      <path d="M1.9 5.725A2.475 2.475 0 0 1 4.375 3.25h6.3a2.475 2.475 0 0 1 2.475 2.475v3.15h2.475A2.475 2.475 0 0 1 18.1 11.35v5.4a.675.675 0 0 1-.675.675H2.575a.675.675 0 0 1-.675-.675zM4.375 4.6c-.621 0-1.125.504-1.125 1.125v10.35h1.913V13.6c0-.31.251-.562.562-.562h3.6c.31 0 .563.251.563.562v2.475H11.8V5.725c0-.621-.504-1.125-1.125-1.125zm4.388 11.475v-1.912H6.288v1.912zm4.387-5.85v5.85h3.6V11.35c0-.621-.504-1.125-1.125-1.125z"></path>
                    </svg>
                  ) : accessLevel === "closed" ? (
                    <svg
                      aria-hidden="true"
                      role="graphics-symbol"
                      viewBox="0 0 20 20"
                      className="w-5 h-5 fill-black dark:fill-white flex-shrink-0"
                    >
                      <path d="M11.794 3.936c.57-.71 1.414-1.141 2.456-1.141s1.886.43 2.456 1.14c.558.696.823 1.618.823 2.582s-.265 1.885-.823 2.58c-.57.71-1.414 1.141-2.456 1.141s-1.886-.43-2.456-1.14c-.558-.696-.823-1.618-.823-2.581 0-.964.265-1.886.823-2.581m.975.782c-.341.426-.548 1.052-.548 1.799s.207 1.373.548 1.798c.33.41.813.673 1.481.673s1.152-.262 1.481-.673c.342-.425.548-1.051.548-1.798s-.206-1.373-.548-1.799c-.33-.41-.813-.673-1.48-.673-.669 0-1.152.263-1.482.673M5.75 3.625c-.956 0-1.734.396-2.259 1.05-.513.64-.755 1.484-.755 2.362s.242 1.723.755 2.362c.525.654 1.303 1.05 2.26 1.05s1.733-.396 2.258-1.05c.513-.64.755-1.484.755-2.362s-.242-1.723-.755-2.362c-.525-.654-1.302-1.05-2.259-1.05M3.986 7.037c0-.661.184-1.21.48-1.58.285-.354.702-.582 1.284-.582s1 .228 1.284.582c.297.37.48.919.48 1.58s-.183 1.21-.48 1.58c-.284.354-.701.582-1.284.582-.582 0-1-.228-1.284-.583-.296-.37-.48-.918-.48-1.579m-.948 8.918h4.69c.114.467.337.894.634 1.25H3.038c-.68 0-1.327-.286-1.742-.764-.432-.498-.606-1.209-.265-1.92.823-1.72 2.636-2.896 4.72-2.896 1.128 0 2.178.346 3.034.936a6.6 6.6 0 0 0-.681 1.05 4.1 4.1 0 0 0-2.354-.736c-1.611 0-2.98.908-3.592 2.186-.1.21-.063.393.082.56.161.186.456.334.798.334M14.25 11.21c-2.334 0-4.354 1.36-5.202 3.323-.309.715-.125 1.419.309 1.912.418.476 1.064.76 1.743.76h6.3c.68 0 1.325-.284 1.744-.76.433-.493.617-1.197.308-1.912-.848-1.963-2.868-3.324-5.202-3.324m-4.054 3.818c.645-1.494 2.207-2.569 4.054-2.569s3.409 1.075 4.055 2.57a.52.52 0 0 1-.1.59c-.166.19-.462.336-.805.336h-6.3c-.342 0-.638-.146-.805-.336a.52.52 0 0 1-.1-.59"></path>
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      role="graphics-symbol"
                      viewBox="0 0 20 20"
                      className="w-5 h-5 fill-black dark:fill-white flex-shrink-0"
                    >
                      <path d="M10.55 12.808a1.35 1.35 0 1 0-1.1 0v1.242a.55.55 0 0 0 1.1 0z"></path>
                      <path d="M10 1.95a4 4 0 0 0-4 4v1.433a2.426 2.426 0 0 0-2.025 2.392v5.4A2.425 2.425 0 0 0 6.4 17.6h7.2a2.425 2.425 0 0 0 2.425-2.425v-5.4A2.426 2.426 0 0 0 14 7.383V5.95a4 4 0 0 0-4-4m2.75 5.4h-5.5v-1.4a2.75 2.75 0 0 1 5.5 0zM5.225 9.775c0-.649.526-1.175 1.175-1.175h7.2c.649 0 1.175.526 1.175 1.175v5.4c0 .649-.526 1.175-1.175 1.175H6.4a1.175 1.175 0 0 1-1.175-1.175z"></path>
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {accessDisplay}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                    {accessDescription}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="w-full flex items-center justify-between pt-[22px]">
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-1.5 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Learn about workareas</span>
            </a>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={isCreating}
                className="px-3 py-1.5 text-sm rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || isCreating}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md font-medium transition-colors",
                  !name.trim() || isCreating
                    ? "opacity-40 cursor-not-allowed bg-blue-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {isCreating ? "Creating..." : "Create teamspace"}
              </button>
            </div>
          </div>
        </div>

        {/* Access Level Dropdown */}
        {isAccessDropdownOpen && typeof window !== "undefined" && createPortal(
          <div
            ref={accessDropdownRef}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="fixed z-[12000] bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 rounded-md p-1 min-w-[280px] flex flex-col gap-[1px]"
            style={{
              top: accessButtonRef.current
                ? accessButtonRef.current.getBoundingClientRect().bottom + 4
                : 0,
              left: accessButtonRef.current
                ? accessButtonRef.current.getBoundingClientRect().left
                : 0,
            }}
          >           

            {/* Open Option */}
            <button
              onClick={() => handleAccessChange("open")}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1 rounded-md transition-colors min-h-[45px]",
                accessLevel === "open"
                  ? "bg-zinc-100 dark:bg-zinc-800"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <div className="flex items-center justify-center min-w-[20px] min-h-[20px]">
                <svg
                  aria-hidden="true"
                  role="graphics-symbol"
                  viewBox="0 0 20 20"
                  className="w-5 h-5 fill-black dark:fill-white flex-shrink-0"
                >
                  <path d="M6.625 6.625a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0M5.95 9.55a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35m.675 1.575a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0M9.1 7.3a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35m.675 1.575a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0M9.1 11.8a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35m6.413.225a.675.675 0 1 1-1.35 0 .675.675 0 0 1 1.35 0m-.675 2.925a.675.675 0 1 0 0-1.35.675.675 0 0 0 0 1.35"></path>
                  <path d="M1.9 5.725A2.475 2.475 0 0 1 4.375 3.25h6.3a2.475 2.475 0 0 1 2.475 2.475v3.15h2.475A2.475 2.475 0 0 1 18.1 11.35v5.4a.675.675 0 0 1-.675.675H2.575a.675.675 0 0 1-.675-.675zM4.375 4.6c-.621 0-1.125.504-1.125 1.125v10.35h1.913V13.6c0-.31.251-.562.562-.562h3.6c.31 0 .563.251.563.562v2.475H11.8V5.725c0-.621-.504-1.125-1.125-1.125zm4.388 11.475v-1.912H6.288v1.912zm4.387-5.85v5.85h3.6V11.35c0-.621-.504-1.125-1.125-1.125z"></path>
                </svg>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm text-zinc-900 dark:text-zinc-100">Open</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  {getAccessDescription("open")}
                </div>
              </div>
              {accessLevel === "open" && (
                <svg
                  aria-hidden="true"
                  role="graphics-symbol"
                  viewBox="0 0 16 16"
                  className="w-4 h-4 fill-current text-zinc-900 dark:text-zinc-100 flex-shrink-0"
                >
                  <path d="M11.834 3.309a.625.625 0 0 1 1.072.642l-5.244 8.74a.625.625 0 0 1-1.01.085L3.155 8.699a.626.626 0 0 1 .95-.813l2.93 3.419z"></path>
                </svg>
              )}
            </button>

            {/* Closed Option */}
            <button
              onClick={() => handleAccessChange("closed")}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1 rounded-md transition-colors min-h-[45px]",
                accessLevel === "closed"
                  ? "bg-zinc-100 dark:bg-zinc-800"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <div className="flex items-center justify-center min-w-[20px] min-h-[20px]">
                <svg
                  aria-hidden="true"
                  role="graphics-symbol"
                  viewBox="0 0 20 20"
                  className="w-5 h-5 fill-black dark:fill-white flex-shrink-0"
                >
                  <path d="M11.794 3.936c.57-.71 1.414-1.141 2.456-1.141s1.886.43 2.456 1.14c.558.696.823 1.618.823 2.582s-.265 1.885-.823 2.58c-.57.71-1.414 1.141-2.456 1.141s-1.886-.43-2.456-1.14c-.558-.696-.823-1.618-.823-2.581 0-.964.265-1.886.823-2.581m.975.782c-.341.426-.548 1.052-.548 1.799s.207 1.373.548 1.798c.33.41.813.673 1.481.673s1.152-.262 1.481-.673c.342-.425.548-1.051.548-1.798s-.206-1.373-.548-1.799c-.33-.41-.813-.673-1.48-.673-.669 0-1.152.263-1.482.673M5.75 3.625c-.956 0-1.734.396-2.259 1.05-.513.64-.755 1.484-.755 2.362s.242 1.723.755 2.362c.525.654 1.303 1.05 2.26 1.05s1.733-.396 2.258-1.05c.513-.64.755-1.484.755-2.362s-.242-1.723-.755-2.362c-.525-.654-1.302-1.05-2.259-1.05M3.986 7.037c0-.661.184-1.21.48-1.58.285-.354.702-.582 1.284-.582s1 .228 1.284.582c.297.37.48.919.48 1.58s-.183 1.21-.48 1.58c-.284.354-.701.582-1.284.582-.582 0-1-.228-1.284-.583-.296-.37-.48-.918-.48-1.579m-.948 8.918h4.69c.114.467.337.894.634 1.25H3.038c-.68 0-1.327-.286-1.742-.764-.432-.498-.606-1.209-.265-1.92.823-1.72 2.636-2.896 4.72-2.896 1.128 0 2.178.346 3.034.936a6.6 6.6 0 0 0-.681 1.05 4.1 4.1 0 0 0-2.354-.736c-1.611 0-2.98.908-3.592 2.186-.1.21-.063.393.082.56.161.186.456.334.798.334M14.25 11.21c-2.334 0-4.354 1.36-5.202 3.323-.309.715-.125 1.419.309 1.912.418.476 1.064.76 1.743.76h6.3c.68 0 1.325-.284 1.744-.76.433-.493.617-1.197.308-1.912-.848-1.963-2.868-3.324-5.202-3.324m-4.054 3.818c.645-1.494 2.207-2.569 4.054-2.569s3.409 1.075 4.055 2.57a.52.52 0 0 1-.1.59c-.166.19-.462.336-.805.336h-6.3c-.342 0-.638-.146-.805-.336a.52.52 0 0 1-.1-.59"></path>
                </svg>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm text-zinc-900 dark:text-zinc-100">Closed</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  {getAccessDescription("closed")}
                </div>
              </div>
            </button>

            {/* Private Option */}
            <button
              onClick={() => handleAccessChange("private")}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1 rounded-md transition-colors min-h-[45px]",
                accessLevel === "private"
                  ? "bg-zinc-100 dark:bg-zinc-800"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <div className="flex items-center justify-center min-w-[20px] min-h-[20px]">
                <svg
                  aria-hidden="true"
                  role="graphics-symbol"
                  viewBox="0 0 20 20"
                  className="w-5 h-5 fill-black dark:fill-white flex-shrink-0"
                >
                  <path d="M10.55 12.808a1.35 1.35 0 1 0-1.1 0v1.242a.55.55 0 0 0 1.1 0z"></path>
                  <path d="M10 1.95a4 4 0 0 0-4 4v1.433a2.426 2.426 0 0 0-2.025 2.392v5.4A2.425 2.425 0 0 0 6.4 17.6h7.2a2.425 2.425 0 0 0 2.425-2.425v-5.4A2.426 2.426 0 0 0 14 7.383V5.95a4 4 0 0 0-4-4m2.75 5.4h-5.5v-1.4a2.75 2.75 0 0 1 5.5 0zM5.225 9.775c0-.649.526-1.175 1.175-1.175h7.2c.649 0 1.175.526 1.175 1.175v5.4c0 .649-.526 1.175-1.175 1.175H6.4a1.175 1.175 0 0 1-1.175-1.175z"></path>
                </svg>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm text-zinc-900 dark:text-zinc-100">Private</span>
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  {getAccessDescription("private")}
                </div>
              </div>
            </button>
          </div>,
          document.body
        )}
      </div>
    </div>,
    document.body
  );
}

