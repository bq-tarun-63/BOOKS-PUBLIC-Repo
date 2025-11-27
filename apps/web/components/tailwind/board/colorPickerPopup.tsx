"use client";

import { Trash2, Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ColorPickerPopupProps {
  readonly currentColor?: string;
  readonly currentName?: string;
  readonly onSelectColor: (color: string) => void;
  readonly onRename?: (name: string) => void;
  readonly onClose: () => void;
  readonly onDelete?: () => void;
  readonly anchorEl?: HTMLElement | null;
}

const COLOR_OPTIONS = [
  { name: "Default", value: "default" },
  { name: "Gray", value: "gray" },
  { name: "Brown", value: "brown" },
  { name: "Orange", value: "orange" },
  { name: "Yellow", value: "yellow" },
  { name: "Green", value: "green" },
  { name: "Blue", value: "blue" },
  { name: "Purple", value: "purple" },
  { name: "Pink", value: "pink" },
  { name: "Red", value: "red" },
];

export default function ColorPickerPopup({
  currentColor = "default",
  currentName = "",
  onSelectColor,
  onRename,
  onClose,
  onDelete,
  anchorEl,
}: ColorPickerPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [optionName, setOptionName] = useState(currentName);

  useEffect(() => {
    setOptionName(currentName);
  }, [currentName]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        // Stop propagation to prevent closing parent modals
        event.stopPropagation();
        onClose();
      }
    }
    // Use capture phase to handle clicks before they reach other handlers
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [onClose]);

  // Position popup relative to anchor element
  // useEffect(() => {
  //   if (anchorEl && popupRef.current) {
  //     const anchorRect = anchorEl.getBoundingClientRect();
  //     const popupRect = popupRef.current.getBoundingClientRect();

  //     // Position to the right of the anchor by default
  //     let left = anchorRect.right + 8;
  //     let top = anchorRect.top;

  //     // If popup would go off screen, position to the left instead
  //     if (left + popupRect.width > globalThis.window.innerWidth) {
  //       left = anchorRect.left - popupRect.width - 8;
  //     }

  //     // If popup would go off screen vertically, adjust
  //     if (top + popupRect.height > globalThis.window.innerHeight) {
  //       top = globalThis.window.innerHeight - popupRect.height - 8;
  //     }

  //     popupRef.current.style.left = `${left}px`;
  //     popupRef.current.style.top = `${top}px`;
  //   }
  // }, [anchorEl]);

  const getColorStyles = (colorValue: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      default: {
        bg: "bg-gray-100 dark:bg-gray-800",
        text: "text-gray-900 dark:text-gray-100",
        border: "border-gray-300 dark:border-gray-600",
      },
      gray: {
        bg: "bg-gray-200 dark:bg-gray-700",
        text: "text-gray-900 dark:text-gray-100",
        border: "border-gray-400 dark:border-gray-500",
      },
      brown: {
        bg: "bg-orange-200 dark:bg-orange-900",
        text: "text-orange-900 dark:text-orange-100",
        border: "border-orange-400 dark:border-orange-700",
      },
      orange: {
        bg: "bg-orange-200 dark:bg-orange-800",
        text: "text-orange-900 dark:text-orange-100",
        border: "border-orange-400 dark:border-orange-600",
      },
      yellow: {
        bg: "bg-yellow-200 dark:bg-yellow-800",
        text: "text-yellow-900 dark:text-yellow-100",
        border: "border-yellow-400 dark:border-yellow-600",
      },
      green: {
        bg: "bg-green-200 dark:bg-green-800",
        text: "text-green-900 dark:text-green-100",
        border: "border-green-400 dark:border-green-600",
      },
      blue: {
        bg: "bg-blue-200 dark:bg-blue-800",
        text: "text-blue-900 dark:text-blue-100",
        border: "border-blue-400 dark:border-blue-600",
      },
      purple: {
        bg: "bg-purple-200 dark:bg-purple-800",
        text: "text-purple-900 dark:text-purple-100",
        border: "border-purple-400 dark:border-purple-600",
      },
      pink: {
        bg: "bg-pink-200 dark:bg-pink-800",
        text: "text-pink-900 dark:text-pink-100",
        border: "border-pink-400 dark:border-pink-600",
      },
      red: {
        bg: "bg-red-200 dark:bg-red-800",
        text: "text-red-900 dark:text-red-100",
        border: "border-red-400 dark:border-red-600",
      },
    };
    return colorMap[colorValue] || colorMap.default;
  };

  return (
    <div
      ref={popupRef}
      className="absolute z-50 flex flex-col w-[220px] min-w-[180px] max-w-[calc(100vw-24px)] max-h-[70vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex-1 overflow-y-auto">
        {/* Rename input */}
        {onRename && (
          <div className="p-2 flex-shrink-0">
            <div className="flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 h-7 min-w-0">
              <input
                type="text"
                placeholder="Option name"
                value={optionName}
                onChange={(e) => setOptionName(e.target.value)}
                onBlur={() => {
                  if (optionName.trim() && optionName.trim() !== currentName) {
                    onRename(optionName.trim());
                  } else {
                    setOptionName(currentName);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    setOptionName(currentName);
                    e.currentTarget.blur();
                  }
                }}
                className="flex-1 text-sm border-none bg-transparent outline-none text-gray-900 dark:text-gray-100 min-w-0"
              />
              <button
                type="button"
                aria-label="Option info"
                className="inline-flex items-center justify-center w-4 h-4 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ml-1 flex-shrink-0"
              >
                <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
        )}
        {/* Delete option (if provided) */}
        {onDelete && (
          <div className="px-1">
            <button
              type="button"
              onClick={onDelete}
              className="w-full flex items-center gap-2 px-1 py-1  rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <div className="flex items-center justify-center w-5 h-5">
                <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400 " />
              </div>
              <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Delete</span>
            </button>
          </div>
        )}

        {/* Divider and Colors header */}
        {onDelete && (
          <div className="relative px-1 my-1.5">
            <div className="absolute top-0 left-3 right-3 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
        )}

        <div className="px-2 py-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">Colors</div>

          {/* Color options */}
          {COLOR_OPTIONS.map((color) => {
            const colorStyles = getColorStyles(color.value);
            const isSelected = currentColor === color.value || (!currentColor && color.value === "default");

            return (
              <button
                key={color.value}
                type="button"
                onClick={() => onSelectColor(color.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                  <div className={`w-4 h-4 rounded ${colorStyles?.bg || "bg-gray-100"} border ${colorStyles?.border || "border-gray-300"}`} />
                </div>
                <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">{color.name}</span>
                {isSelected && (
                  <svg
                    aria-hidden="true"
                    role="graphics-symbol"
                    viewBox="0 0 16 16"
                    className="w-4 h-4 fill-current flex-shrink-0"
                  >
                    <path d="M11.834 3.309a.625.625 0 0 1 1.072.642l-5.244 8.74a.625.625 0 0 1-1.01.085L3.155 8.699a.626.626 0 0 1 .95-.813l2.93 3.419z" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
