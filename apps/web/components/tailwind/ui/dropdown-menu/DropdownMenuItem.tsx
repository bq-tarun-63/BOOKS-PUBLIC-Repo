"use client";

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DropdownMenuItemProps } from './types';

export function DropdownMenuItem({
  id: _id, // Exclude from props spread (used only for React key in parent)
  label,
  icon,
  onClick,
  disabled = false,
  hasChevron = false,
  count,
  badge,
  rightElement,
  selected = false,
  variant = 'default',
  className,
  onMouseEnter,
  onMouseLeave,
  'aria-label': ariaLabel,
  ...props
}: DropdownMenuItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  // Variant styles
  const variantStyles = {
    default: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
    destructive: "text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400",
  };
  
  // Selected state styles (overrides variant for selected items)
  const selectedStyles = selected && variant === 'default' 
    ? "text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800"
    : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={ariaLabel || label}
      className={cn(
        // Base styles - matching the exact style from boardSettingDropdown
        "flex items-center justify-between w-full px-3 py-2 text-sm rounded",
        "transition-colors focus:outline-none",
        // Selected state (overrides variant for selected items)
        selectedStyles || variantStyles[variant],
        // Disabled state
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {/* Left side: Icon + Label */}
      <div className="flex items-center gap-2">
        {icon && (
          <span aria-hidden="true">
            {icon}
          </span>
        )}
        <span>{label}</span>
      </div>

      {/* Right side: Count/Badge + ChevronRight + Custom rightElement */}
      <div className="flex items-center text-muted-foreground">
        {count !== undefined && count !== null && (
          <span className="text-xs mr-1">{count}</span>
        )}
        {badge && (
          <span className="text-xs mr-1">{badge}</span>
        )}
        {hasChevron && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
        {rightElement && (
          <span className="ml-auto">{rightElement}</span>
        )}
      </div>
    </button>
  );
}

