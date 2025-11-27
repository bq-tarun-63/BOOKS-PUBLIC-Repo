"use client";

import React from 'react';
import { Editor } from '@tiptap/core';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DropdownMenuItemProps } from '@/components/tailwind/ui/dropdown-menu';

interface EditorBubbleMenuListProps {
  items: DropdownMenuItemProps[];
  editor: Editor;
  className?: string;
}

export function EditorBubbleMenuList({
  items,
  editor,
  className,
}: EditorBubbleMenuListProps) {
  // Variant styles (matching DropdownMenuItem)
  const variantStyles = {
    default: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
    destructive: "text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400",
  };
  
  // Selected state styles
  const selectedStyles = "text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800";

  const handleItemClick = (item: DropdownMenuItemProps, e: React.MouseEvent) => {
    if (item.disabled) {
      e.preventDefault();
      return;
    }
    
    // Prevent the click from affecting the editor or closing menu prematurely
    e.preventDefault();
    e.stopPropagation();
    
    // Call the original onClick - it will handle the command execution
    // The onClick handler should prevent default and stop propagation
    item.onClick?.(e);
  };

  return (
    <div className={cn("flex flex-col p-1", className)}>
      {items.map((item) => {
        const isSelected = item.selected && item.variant === 'default';
        const variantStyle = isSelected ? selectedStyles : variantStyles[item.variant || 'default'];
        
        return (
          <div
            key={item.id}
            onClick={(e) => handleItemClick(item, e)}
            className={cn(
              // Base styles - matching DropdownMenuItem
              "flex items-center justify-between w-full px-3 py-2 text-sm rounded",
              "transition-colors focus:outline-none",
              item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              !item.disabled && variantStyle,
              item.className
            )}
            onMouseEnter={item.onMouseEnter}
            onMouseLeave={item.onMouseLeave}
            aria-label={item['aria-label'] || item.label}
          >
            {/* Left side: Icon + Label */}
            <div className="flex items-center gap-2">
              {item.icon && (
                <span aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
            </div>

            {/* Right side: Count/Badge + ChevronRight + Custom rightElement */}
            <div className="flex items-center text-muted-foreground">
              {item.count !== undefined && item.count !== null && (
                <span className="text-xs mr-1">{item.count}</span>
              )}
              {item.badge && (
                <span className="text-xs mr-1">{item.badge}</span>
              )}
              {item.hasChevron && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              {item.rightElement && (
                <span className="ml-auto">{item.rightElement}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

