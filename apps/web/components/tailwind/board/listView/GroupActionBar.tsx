"use client";

import React, { useState, useRef, useEffect } from "react";
import { Trash2, MoreHorizontal } from "lucide-react";

interface GroupActionBarProps {
  selectedCount: number;
  properties: Array<{ id: string; name: string; type: string; icon: React.ReactNode }>;
  onOpenEditor: (propertyId: string, anchor: HTMLElement) => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
}

export default function GroupActionBar({
  selectedCount,
  properties,
  onOpenEditor,
  onDeleteSelected,
  onClearSelection,
}: GroupActionBarProps) {
  // Filter out title property
  const filteredProperties = properties.filter((property) => property.id !== "title");
  const visibleProperties = filteredProperties.slice(0, 5);

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMoreClick = () => {
    setShowMoreMenu((prev) => !prev);
  };

  const handlePropertyClickFromMenu = (propertyId: string) => {
    if (moreButtonRef.current) {
      onOpenEditor(propertyId, moreButtonRef.current);
    }
    setShowMoreMenu(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target as Node)
      ) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="sticky top-0 z-20 inline-flex items-center border rounded-md shadow-md bg-white dark:bg-[#1f1f1f] text-sm text-gray-700 dark:text-gray-200"
      style={{ height: "38px", paddingInline: "6px" }}
    >
      {/* Selected count */}
      <div className="px-3 font-medium text-blue-600 whitespace-nowrap border-r border-gray-200 dark:border-gray-700">
        {selectedCount} selected
      </div>

      {/* Property buttons - only show first 5 */}
      <div className="flex items-center">
        {visibleProperties.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={(e) => onOpenEditor(p.id, e.currentTarget)}
            className="flex items-center gap-1 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-r border-gray-200 dark:border-gray-700"
            title={`Edit ${p.name}`}
          >
            <span className="w-4 h-4 text-gray-500 dark:text-gray-400">{p.icon}</span>
            <p className="m-0 text-sm">{p.name}</p>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center relative">
        {/* Delete button */}
        <button
          type="button"
          onClick={onDeleteSelected}
          className="flex items-center px-2 justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700"
          title="Delete selected"
        >
          <Trash2 className="h-4 w-4 shrink-0" />
        </button>

        {/* More button */}
        <button
          ref={moreButtonRef}
          type="button"
          onClick={handleMoreClick}
          className="flex items-center px-2 justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          title="More options"
        >
          <MoreHorizontal className="h-4 w-4 shrink-0" />
        </button>

        {/* Absolute-positioned dropdown (column layout) */}
        {showMoreMenu && (
          <div
            ref={menuRef}
            className="absolute top-5 left-10 mt-1 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-30 w-56 max-h-[70vh] overflow-y-auto"
          >
            {filteredProperties.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePropertyClickFromMenu(p.id)}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <span className="w-4 h-4 text-gray-500 dark:text-gray-400">{p.icon}</span>
                <span className="text-sm">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
