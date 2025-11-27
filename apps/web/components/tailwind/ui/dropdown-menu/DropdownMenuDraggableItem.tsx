"use client";

import React, { ReactNode } from 'react';
import { Eye, EyeOff, GripVertical, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownMenuDraggableItemProps {
  id: string;
  label: string;
  icon?: ReactNode;
  // Right element type: 'eye' for visibility toggle, 'chevron' for chevron right, or custom ReactNode
  rightElement?: 'eye' | 'chevron' | ReactNode;
  isVisible?: boolean; // Only used when rightElement is 'eye'
  onToggleVisibility?: () => void; // Only used when rightElement is 'eye'
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  // Drag and drop handlers
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-selected'?: boolean;
  tabIndex?: number;
}

export function DropdownMenuDraggableItem({
  id,
  label,
  icon,
  rightElement = 'eye',
  isVisible = false,
  onToggleVisibility,
  onClick,
  onKeyDown,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver = false,
  isDragging = false,
  isSelected = false,
  className,
  'aria-label': ariaLabel,
  'aria-selected': ariaSelected,
  tabIndex = 0,
}: DropdownMenuDraggableItemProps) {
  // Render right element based on type
  const renderRightElement = () => {
    if (rightElement === 'eye') {
      return (
        <div className="ml-auto min-w-0 flex-shrink-0">
          <div className="flex items-center">
            <button
              type="button"
              aria-label={isVisible ? "Hide property" : "Show property"}
              className="inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility?.();
              }}
            >
              {isVisible ? (
                <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>
      );
    } else if (rightElement === 'chevron') {
      return (
        <div className="flex items-center gap-1 flex-shrink-0">
          <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />
        </div>
      );
    } else if (rightElement) {
      // Custom ReactNode
      return (
        <div className="ml-auto min-w-0 flex-shrink-0">
          {rightElement}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      key={id}
      role="menuitem"
      tabIndex={tabIndex}
      className={cn(
        "flex items-center justify-between rounded px-2 pl-0 py-1.5 transition cursor-pointer",
        isDragOver ? "bg-gray-100 dark:bg-gray-800" : "hover:bg-gray-100 dark:hover:bg-gray-800",
        isDragging && "opacity-50",
        isSelected && "bg-gray-100 dark:bg-gray-800",
        className
      )}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel || label}
      aria-selected={ariaSelected}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="cursor-grab text-gray-400" aria-hidden="true">
          <GripVertical className="w-4 h-4" />
        </span>
        {icon && (
          <span aria-hidden="true" className="flex-shrink-0">
            {icon}
          </span>
        )}
        <span className="truncate text-sm text-gray-900 dark:text-gray-100">
          {label}
        </span>
      </div>
      {renderRightElement()}
    </div>
  );
}

